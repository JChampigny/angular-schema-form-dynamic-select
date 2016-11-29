angular.module('schemaForm').config(
    ['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
        function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
            var stringSelect = function (name, schema, options) {
                if ((schema.type === 'string') && ("enum" in schema)) {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = (schema.format && schema.format === "uiselect") ? 'uiselect' : 'strapselect';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            var intSelect = function (name, schema, options) {
                if (schema.type === 'integer') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = (schema.format && schema.format === "uiselect") ? 'uiselect' : 'strapselect';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            schemaFormProvider.defaults.string.unshift(stringSelect);
            schemaFormProvider.defaults.integer.unshift(intSelect);

            //Add to the bootstrap directive
            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'strapselect',
                'directives/decorators/bootstrap/strap/strapselect.html');

            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'strapmultiselect',
                'directives/decorators/bootstrap/strap/strapmultiselect.html');

            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'strapselectdynamic',
                'directives/decorators/bootstrap/strap/strapselect.html');

            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'strapmultiselectdynamic',
                'directives/decorators/bootstrap/strap/strapmultiselect.html');

            // UI SELECT
            //Add to the bootstrap directive
            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'uiselect',
                'directives/decorators/bootstrap/uiselect/uiselect.html');

            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'uiselectmultiple',
                'directives/decorators/bootstrap/uiselect/uiselectmultiple.html');
        }])
    .directive("gmUiSelectMultiple", [
        'sfValidator', 'sfPath', 'sfSelect',
        function (sfValidator, sfPath, sfSelect) {
            return {
                require: 'ngModel',
                restrict: 'A',
                scope: true,
                controller: 'dynamicSelectController',
                link: function ($scope, $element, $attrs, ngModel) {
                    var once = $scope.$watch($attrs.gmUiSelectMultiple, function (form) {
                        if (!form) {
                            return;
                        }

                        var list = sfSelect(form.key, $scope.model);

                        var key = sfPath.normalize(form.key);
                        $scope.$watch('model' + (key[0] !== '[' ? '.' : '') + key, function (value) {
                            list = $scope.internalModel = value;
                        });
                        $scope.$watch('$parent.internalModel', function (value) {
                            list = $scope.internalModel = value;
                        });
                        $scope.internalModel = list;

                        if (ngModel) {
                            ngModel.$name = form.key[0];

                            $scope.validate = function () {
                                // We set the viewValue to trigger parsers,
                                // since modelValue might be empty and validating just that
                                // might change an existing error to a "required" error message.
                                if (ngModel.$setDirty) {

                                    // Angular 1.3+
                                    ngModel.$setDirty();
                                    ngModel.$setViewValue(ngModel.$viewValue);
                                    ngModel.$commitViewValue();

                                    // In Angular 1.3 setting undefined as a viewValue does not trigger parsers
                                    // so we need to do a special required check. Fortunately we have $isEmpty
                                    if (form.required && !ngModel.$modelValue.length) {
                                        ngModel.$setValidity('tv4-302', false);
                                    }
                                } else {
                                    // Angular 1.2
                                    // In angular 1.2 setting a viewValue of undefined will trigger the parser.
                                    // hence required works.
                                    ngModel.$setViewValue(ngModel.$viewValue);
                                }
                            }

                            $scope.$on('schemaFormValidate', $scope.validate);
                        }

                        once();
                    });
                }
            };
        }])
    .directive("toggleSingleModel", function () {
        // somehow we get this to work ...
        return {
            require: 'ngModel',
            restrict: "A",
            scope: {
                toggleSingleModel: '='
            },
            replace: true,
            controller: ['$scope', function ($scope) {
                if (!$scope.toggleSingleModel)
                    return;

                $scope.$parent.$watch('selectModel.selected', function () {
                    if ($scope.$parent.selectModel.selected != undefined) {
                        $scope.$parent.insideModel = $scope.$parent.selectModel.selected.value;
                        $scope.$parent.ngModel.$setViewValue($scope.$parent.selectModel.selected.value);
                    }
                });
            }]
        };
    })
    .directive('multipleOn', function () {
        return {
            link: function ($scope, $element, $attrs) {
                $scope.$watch(
                    function () { return $element.attr('multiple-on'); },
                    function (newVal) {
                        if (newVal === "true") {
                            var selectScope = angular.element($element).scope().$$childTail;
                            selectScope.$isMultiple = true;
                            selectScope.options.multiple = true;
                            selectScope.$select.$element.addClass('select-multiple');
                        } else {
                            angular.element($element).scope().$$childTail.$isMultiple = false;
                        }
                    }
                );
            }
        };
    })
    .directive('validate', function () {
        return {
            require: 'ngModel',
            restrict: "A",
            // We want the link function to be *after* the input directives link function so we get access
            // the parsed value, ex. a number instead of a string
            priority: 500,
            link: function ($scope, $element, $attrs, ngModel) {
                // We need the ngModelController on several places,
                // most notably for errors.
                // So we emit it up to the decorator directive so it can put it on scope.
                $scope.$emit('schemaFormPropagateNgModelController', ngModel);

                var form = $scope.$eval($attrs.schemaValidate);

                // If there is a ngModel present we need to validate when asked.
                if (ngModel) {
                    $scope.validate = function () {
                        // We set the viewValue to trigger parsers,
                        // since modelValue might be empty and validating just that
                        // might change an existing error to a "required" error message.
                        if (ngModel.$setDirty) {

                            // Angular 1.3+
                            ngModel.$setDirty();
                            ngModel.$setViewValue(ngModel.$viewValue);
                            ngModel.$commitViewValue();

                            // In Angular 1.3 setting undefined as a viewValue does not trigger parsers
                            // so we need to do a special required check. Fortunately we have $isEmpty
                            if (form.required && ngModel.$isEmpty(ngModel.$modelValue)) {
                                ngModel.$setValidity('tv4-302', false);
                            } else if (!form.required && ngModel.$isEmpty(ngModel.$modelValue)) {
                                ngModel.$setValidity('tv4-0', true);
                                ngModel.$setValidity('schemaForm', true);
                            }

                        } else {
                            // Angular 1.2
                            // In angular 1.2 setting a viewValue of undefined will trigger the parser.
                            // hence required works.
                            ngModel.$setViewValue(ngModel.$viewValue);
                        }
                    }

                    $scope.$on('schemaFormValidate', $scope.validate);
                }

                //$scope.$parent.$parent.$parent.$parent.$watch('model["' + form.key[0] + '"]', function (values) {
                //    console.log(values);
                //    $('button[name=' + form.key[0] + ']').next().find('li').each(function (index) {
                //        if (index !== 0) {
                //            $(this).attr('class', (values && values[0] === "0") ? "active" : "");
                //        }
                //    });
                //});
            }
        }
    })
    .filter('whereMulti', function () {
        return function (items, key, values) {
            var out = [];

            if (angular.isArray(values) && items !== undefined) {
                values.forEach(function (value) {
                    for (var i = 0; i < items.length; i++) {
                        if (value === items[i][key]) {
                            out.push(items[i]);
                            break;
                        }
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    })
    .filter('propsFilter', function () {
        return function (items, props) {
            var out = [];

            if (angular.isArray(items)) {
                items.forEach(function (item) {
                    var itemMatches = false;
                    var keys = Object.keys(props);

                    for (var i = 0; i < keys.length; i++) {
                        var prop = keys[i];
                        if (item.hasOwnProperty(prop)) {
                            //only match if this property is actually in the item to avoid
                            var text = props[prop].toLowerCase();
                            //search for either a space before the text or the textg at the start of the string so that the middle of words are not matched
                            if (item[prop].toString().toLowerCase().indexOf(text) === 0 || (item[prop].toString()).toLowerCase().indexOf(' ' + text) !== -1) {
                                itemMatches = true;
                                break;
                            }
                        }
                    }

                    if (itemMatches) {
                        out.push(item);
                    }
                });
            } else {
                // Let the output be the input untouched
                out = items;
            }

            return out;
        };
    });

angular.module('schemaForm').controller('dynamicSelectController',
    ['$rootScope', '$scope', '$http', '$timeout', 'sfPath',
        function ($rootScope, $scope, $http, $timeout, sfPath) {
            $scope = $scope.$parent;
            if (!$scope.form.options) {
                $scope.form.options = {};
            }

            $scope.selectModel = {};
            $scope.form.options.scope = $scope;

            $scope.triggerTitleMap = function () {
                // Ugly workaround to trigger titleMap expression re-evaluation so that the selectFilter it reapplied.
                $scope.form.titleMap.push({ "value": "H45890u340598u3405u9", "name": "34095u3p4ouij" });
                $timeout(function () { $scope.form.titleMap.pop() });
            };

            $scope.initFiltering = function (localModel) {
                if ($scope.form.options.filterTriggers) {
                    $scope.form.options.filterTriggers.forEach(function (trigger) {
                        $scope.$parent.$watch(trigger, $scope.triggerTitleMap);
                    });
                }
                // This is set here, as the model value may become unitialized and typeless if validation fails.
                $scope.localModelType = Object.prototype.toString.call(localModel);
                $scope.filteringInitialized = true;
            };

            $scope.finalizeTitleMap = function (form, data, newOptions) {
                // Remap the data
                form.titleMap = [];
                if (newOptions && "map" in newOptions && newOptions.map) {
                    var final = newOptions.map.nameProperty.length - 1,
                    separator = newOptions.map.separatorValue ? newOptions.map.separatorValue : '';

                    data.forEach(function (currentRow) {
                        currentRow["value"] = currentRow[newOptions.map.valueProperty];
                        //check if the value passed is a string or not
                        if (typeof newOptions.map.nameProperty != 'string') {
                            //loop through the object/array
                            var newName = "";
                            for (var i in newOptions.map.nameProperty) {
                                newName += currentRow[newOptions.map.nameProperty[i]];
                                if (i !== final) { newName += separator };
                            }
                            currentRow["name"] = newName; //init the 'name' property
                        } else {
                            //if it is a string
                            currentRow["name"] = currentRow[newOptions.map.nameProperty];
                        }
                        form.titleMap.push(currentRow);
                    });
                } else {
                    data.forEach(function (item) {
                        if ("text" in item) {
                            item.name = item.text;
                        }
                    });
                    form.titleMap = data;
                }

                function getValueWithSimpleType(form, value) {
                    var type = (form.schema) ? form.schema.type : form.type;

                    if (type === "array") {
                        return getValueWithSimpleType(form.schema.items, value);
                    } else if (type === "string") {
                        return "" + value;
                    } else {
                        return parseInt(value);
                    }
                }

                // Select all option
                if (data.length > 1 && data[0].id && newOptions.hasOwnProperty('selectAll') && newOptions.selectAll) {
                    form.titleMap.splice(0, 0, {
                        value: getValueWithSimpleType(form, 0),
                        name: (newOptions.hasOwnProperty('selectAllName')) ? (newOptions.selectAllName.endsWith('s')) ? newOptions.selectAllName : newOptions.selectAllName + 's' : "All"
                    });
                }

                // Select none option
                if ((data.length === 0 || data[0].id && newOptions.hasOwnProperty('selectNone')) && newOptions.selectNone) {
                    form.titleMap.push({
                        value: getValueWithSimpleType(form, -1),
                        name: "None"
                    });
                }

                if ($scope.insideModel && $scope.selectModel.selected === undefined) {
                    $scope.selectModel.selected = $scope.findInTitleMap($scope.insideModel);
                } else if (data.length === 1) {
                    $scope.insideModel = form.titleMap[0].value;
                    $scope.selectModel.selected = { value: form.titleMap[0].value, name: form.titleMap[0].name }
                }

                // The ui-selects needs to be reinitialized (UI select sets the internalModel and externalModel.
                if ($scope.internalModel) {
                    console.log("Call uiMultiSelectInitInternalModel");
                    $scope.uiMultiSelectInitInternalModel($scope.externalModel);
                }
            };

            $scope.clone = function (obj) {
                // Clone an object (except references to this scope)
                if (null == obj || "object" != typeof (obj)) return obj;

                var copy = obj.constructor();
                for (var attr in obj) {
                    // Do not clone if it is this scope
                    if (obj[attr] !== $scope) {
                        if (obj.hasOwnProperty(attr)) copy[attr] = $scope.clone(obj[attr]);
                    }
                }
                return copy;
            };

            $scope.getCallback = function (callback) {
                if (typeof (callback) == "string") {
                    var _result = $scope.$parent.evalExpr(callback);
                    if (typeof (_result) == "function") {
                        return _result;
                    } else {
                        throw ("A callback string must match name of a function in the parent scope");
                    }
                } else if (typeof (callback) == "function") {
                    return callback;
                } else {
                    throw ("A callback must either be a string matching the name of a function in the parent scope or a " +
                        "direct function reference");
                }
            };

            $scope.getOptions = function (options, search) {
                // If defined, let the a callback function manipulate the options
                if (options.httpPost && options.httpPost.optionsCallback) {
                    var newOptionInstance = $scope.clone(options);
                    return $scope.getCallback(options.httpPost.optionsCallback)(newOptionInstance, search);
                }

                if (options.httpGet && options.httpGet.optionsCallback) {
                    var newOptionInstance = $scope.clone(options);
                    return $scope.getCallback(options.httpGet.optionsCallback)(newOptionInstance, search);
                }

                return options;
            };

            $scope.test = function (form) {
                form.titleMap.pop();
            };

            $scope.select = function (form, item) {
                var key = form.key[0];
                if (!$scope.model.hasOwnProperty(key)) {
                    $scope.model[key] = [];
                }

                $scope.model[key].push(item.value);
            }

            $scope.remove = function (form, item) {
                var key = form.key[0];
                $scope.model[key].splice($scope.model[key].indexOf(item.value), 1);
            }

            $scope.uiSelection = function (model, value) {
                if (!$scope.form.options.hasOwnProperty('registerEvents'))
                    return;
                
                $scope.form.options.registerEvents.forEach(function (event) {
                    console.log("Register event with name: " + event);
                    $rootScope.$broadcast(event, value.map(function (elem) { return elem.value; }).join());
                });
            }

            function triggerEvent(form, value) {
                if (form.options.hasOwnProperty("updateModelOnSelection")) {
                    form.options.updateModelOnSelection(value);
                }

                if (form.options.hasOwnProperty("registerEvents") && form.options.registerEvents) {
                    form.options.registerEvents.forEach(function (event) {
                        console.log("Register event with name: " + event);
                        $rootScope.$broadcast(event, value);
                    });
                }
            }

            $scope.populateTitleMap = function (form, search) {
                if (form.options && form.options.registerEvents) {
                    form.onChange = function (value) {
                        if (value !== undefined)
                            triggerEvent(form, value);
                    };
                }
                function getModel(scope) {
                    if ('model' in scope)
                        return scope.model;
                    if ('$parent' in scope)
                        getModel(scope.$parent);

                    return null;
                };

                if (form.schema && "enum" in form.schema) {
                    form.titleMap = [];
                    form.schema.enum.forEach(function (item) {
                        form.titleMap.push({ "value": item, "name": item });
                    });
                } else if (!form.options) {
                    console.log("dynamicSelectController.populateTitleMap(key:" + form.key + ") : No options set, needed for dynamic selects");
                } else if (form.options.callback) {
                    $scope.finalizeTitleMap(form, [{ id: undefined, name: "Awaiting parent selection" }], form.options);
                    if (form.options.listenEvents) {
                        if (!form.options && !form.options.callback)
                            throw ("No Callback was found in the options attribute");

                        $scope.listenEventsArgs = [];

                        form.options.listenEvents.forEach(function (listenEvent) {
                            $scope.$on(listenEvent.name, function (event, args) {
                                var updatedArg = false;

                                $scope.listenEventsArgs.forEach(function (arg) {
                                    if (arg.name === listenEvent.argName) {
                                        arg.value = args;
                                        updatedArg = true;
                                    }
                                });

                                if ($scope.listenEventsArgs.length !== form.options.listenEvents.length && !updatedArg)
                                    $scope.listenEventsArgs.push({ name: listenEvent.argName, value: args });

                                if ($scope.listenEventsArgs.length === form.options.listenEvents.length) {
                                    $scope.finalizeTitleMap(form, [{ id: undefined, name: "Loading" }], form.options);
                                    form.titleMap = $scope.getCallback(form.options.callback)($scope.listenEventsArgs, search);
                                    $scope.finalizeTitleMap(form, form.titleMap, form.options);
                                }
                            });
                        });
                    } else {
                        $scope.finalizeTitleMap(form, [{ id: undefined, name: "Loading" }], form.options);
                        form.titleMap = $scope.getCallback(form.options.callback)(form.options, search);
                        $scope.finalizeTitleMap(form, form.titleMap, form.options);
                    }
                } else if (form.options.asyncCallback) {
                    $scope.finalizeTitleMap(form, [{ id: undefined, name: "Awaiting parent selection" }], form.options);
                    if (form.options.listenEvents) {
                        if (!form.options && !form.options.asyncCallback)
                            throw ("No Callback was found in the options attribute");

                        $scope.listenEventsArgs = [];

                        form.options.listenEvents.forEach(function (listenEvent) {
                            $scope.$on(listenEvent.name, function (event, args) {


                                var updatedArg = false;

                                $scope.listenEventsArgs.forEach(function (arg) {
                                    if (arg.name === listenEvent.argName) {
                                        arg.value = args;
                                        updatedArg = true;
                                    }
                                });

                                if ($scope.listenEventsArgs.length !== form.options.listenEvents.length && !updatedArg)
                                    $scope.listenEventsArgs.push({ name: listenEvent.argName, value: args });

                                if ($scope.listenEventsArgs.length === form.options.listenEvents.length && getModel($scope) != null) {
                                    // if model already has a value, try to set it afterwards
                                    var oldModelValue = getModel($scope)[form.key[0]];
                                    $scope.finalizeTitleMap(form, [{ id: oldModelValue, name: "Loading" }], form.options);
                                    return $scope.getCallback(form.options.asyncCallback)($scope.listenEventsArgs, search).then(
                                        function (_data) {
                                            // Remove from model all items that are not in the new data
                                            var modelValue = getModel($scope)[form.key[0]];
                                            var deleteModel = true;
                                            if (form.type !== "uiselectmultiple") {
                                                for (var i in _data.data) {
                                                    if (_data.data[i].id === modelValue)
                                                        deleteModel = false;
                                                }

                                                if (deleteModel) delete modelValue;
                                            } // else {
                                            //    var deleteModel = true;
                                            //    for (var i in model) {
                                            //        for (var j in _data.data) {
                                            //            if (model[i] === _data.data[j].id)
                                            //                deleteModel = false;
                                            //        }
                                            //        if (deleteModel) delete model[i];
                                            //    }
                                            //}

                                            // Finilize the title map
                                            $scope.finalizeTitleMap(form, _data.data, form.options);
                                        },
                                        function (data, status) {
                                            alert("Loading select items failed \nError: " + JSON.stringify(data));
                                        });
                                }
                            });

                            //if ($scope.model[listenEvent.name]) {
                            //    $scope.$emit(listenEvent.name, $scope.model[listenEvent.name]);
                            //}
                            var model = getModel($scope);
                            if (model != null && model[listenEvent.name]) {
                                $scope.$emit(listenEvent.name, model[listenEvent.name]);
                            }
                        });
                    } else {
                        var oldModelValue = getModel($scope) != null ? getModel($scope)[form.key[0]] : undefined;
                        $scope.finalizeTitleMap(form, [{ id: oldModelValue, name: "Loading" }], form.options);
                        return $scope.getCallback(form.options.asyncCallback)(form.options, search).then(
                            function (_data) {
                                $scope.finalizeTitleMap(form, _data.data, form.options);
                                if ($scope.ngModel.$modelValue) {
                                    triggerEvent(form, $scope.ngModel.$modelValue);
                                }
                            },
                            function (data) {
                                alert("Loading select items failed \nError: " + JSON.stringify(data));
                            });
                    }
                } else if (form.options.httpPost) {
                    var finalOptions = $scope.getOptions(form.options, search);

                    return $http.post(finalOptions.httpPost.url, finalOptions.httpPost.parameter).then(
                        function (_data) {
                            $scope.finalizeTitleMap(form, _data.data, finalOptions);
                        },
                        function (data) {
                            alert("Loading select items failed (URL: '" + String(finalOptions.httpPost.url) +
                            "' Parameter: " + String(finalOptions.httpPost.parameter) + "\nError: " + JSON.stringify(data));
                        });
                }
                else if (form.options.httpGet) {
                    var finalOptions = $scope.getOptions(form.options, search);
                    return $http.get(finalOptions.httpGet.url, finalOptions.httpGet.parameter).then(
                        function (data) {
                            $scope.finalizeTitleMap(form, data.data, finalOptions);
                        },
                        function (data) {
                            alert("Loading select items failed (URL: '" + String(finalOptions.httpGet.url) +
                            "\nError: " + JSON.stringify(data));
                        });
                }
            };

            $scope.findInTitleMap = function (value) {
                if (!$scope.form.titleMap)
                    return null;

                for (var i = 0; i < $scope.form.titleMap.length; i++) {
                    if ($scope.form.titleMap[i].value === value) {
                        return { "value": $scope.form.titleMap[i].value, "name": $scope.form.titleMap[i].name }
                    }
                }
            };

            $scope.uiMultiSelectInitInternalModel = function (suppliedModel) {
                $scope.externalModel = suppliedModel;
                $scope.internalModel = [];
                if ($scope.form.titleMap) {
                    if (suppliedModel !== 'undefined' && angular.isArray(suppliedModel)) {
                        suppliedModel.forEach(function (value) {
                            $scope.internalModel.push($scope.findInTitleMap(value));
                        });
                    }
                }
            };
        }]);

angular.module('schemaForm').filter('selectFilter', [function ($filter) {
    return function (inputArray, controller, localModel, strLocalModel) {
        // As the controllers' .model is the global and its form is the local, we need to get the local model as well.
        // We also need to be able to set it if is undefined after a validation failure,so for that we need
        // its string representation as well as we do not know its name. A typical value if strLocalModel is model['groups']
        // This is very ugly, though. TODO: Find out why the model is set to undefined after validation failure.

        if (!angular.isDefined(inputArray) || !angular.isDefined(controller.form.options) ||
            !angular.isDefined(controller.form.options.filter) || controller.form.options.filter === '') {
            return inputArray;
        }

        console.log("----- In filtering for " + controller.form.key + "(" + controller.form.title + "), model value: " + JSON.stringify(localModel) + "----");
        console.log("Filter:" + controller.form.options.filter);
        if (!controller.filteringInitialized) {
            console.log("Initialize filter");
            controller.initFiltering(localModel);
        }

        var data = [];

        angular.forEach(inputArray, function (currItem) {
            //console.log("Compare: curr_item: " + JSON.stringify(curr_item) +
            //"with : " + JSON.stringify( controller.$eval(controller.form.options.filterTriggers[0])));
            if (controller.$eval(controller.form.options.filter, { item: currItem })) {
                data.push(currItem);
            } else if (localModel) {
                // If not in list, also remove the set value

                if (controller.localModelType === "[object Array]" && localModel.indexOf(currItem.value) > -1) {
                    localModel.splice(localModel.indexOf(currItem.value), 1);
                } else if (localModel === currItem.value) {
                    console.log("Setting model of type " + controller.localModelType + "to null.");
                    localModel = null;
                }
            }
        });

        if (controller.localModelType === "[object Array]" && !localModel) {
            // An undefined local model seems to mess up bootstrap select's indicators
            console.log("Resetting model of type " + controller.localModelType + " to [].");

            controller.$eval(strLocalModel + "=[]");
        }

        //console.log("Input: " + JSON.stringify(inputArray));
        //console.log("Output: " + JSON.stringify(data));
        //console.log("Model value out : " + JSON.stringify(localModel));
        console.log("----- Exiting filter for " + controller.form.title + "-----");

        return data;
    };
}]);
