/* global angular */
'use strict';

angular
    .module('schemaForm')
    .config(['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
        function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
            var defaultPatternMsg = 'Wrong file type. Allowed types are ',
                defaultMaxSizeMsg1 = 'This file is too large. Maximum size allowed is ',
                defaultMaxSizeMsg2 = 'Current file size:',
                defaultMinItemsMsg = 'You have to upload at least one file',
                defaultMaxItemsMsg = 'You can\'t upload more than one file.';

            var nwpSinglefileUpload = function (name, schema, options) {
                if (schema.type === 'array' && schema.format === 'singlefile') {
                    if (schema.pattern && schema.pattern.mimeType && !schema.pattern.validationMessage) {
                        schema.pattern.validationMessage = defaultPatternMsg;
                    }
                    if (schema.maxSize && schema.maxSize.maximum && !schema.maxSize.validationMessage) {
                        schema.maxSize.validationMessage = defaultMaxSizeMsg1;
                        schema.maxSize.validationMessage2 = defaultMaxSizeMsg2;
                    }
                    if (schema.minItems && schema.minItems.minimum && !schema.minItems.validationMessage) {
                        schema.minItems.validationMessage = defaultMinItemsMsg;
                    }
                    if (schema.maxItems && schema.maxItems.maximum && !schema.maxItems.validationMessage) {
                        schema.maxItems.validationMessage = defaultMaxItemsMsg;
                    }

                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'nwpFileUpload';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            schemaFormProvider.defaults.array.unshift(nwpSinglefileUpload);

            var nwpMultifileUpload = function (name, schema, options) {
                if (schema.type === 'array' && schema.format === 'multifile') {
                    if (schema.pattern && schema.pattern.mimeType && !schema.pattern.validationMessage) {
                        schema.pattern.validationMessage = defaultPatternMsg;
                    }
                    if (schema.maxSize && schema.maxSize.maximum && !schema.maxSize.validationMessage) {
                        schema.maxSize.validationMessage = defaultMaxSizeMsg1;
                        schema.maxSize.validationMessage2 = defaultMaxSizeMsg2;
                    }
                    if (schema.minItems && schema.minItems.minimum && !schema.minItems.validationMessage) {
                        schema.minItems.validationMessage = defaultMinItemsMsg;
                    }
                    if (schema.maxItems && schema.maxItems.maximum && !schema.maxItems.validationMessage) {
                        schema.maxItems.validationMessage = defaultMaxItemsMsg;
                    }

                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'nwpFileUpload';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            schemaFormProvider.defaults.array.unshift(nwpMultifileUpload);

            schemaFormDecoratorsProvider.addMapping(
                'bootstrapDecorator',
                'nwpFileUpload',
                'directives/decorators/bootstrap/nwp-file/nwp-file.html'
            );
        }
    ]);

angular
    .module('ngSchemaFormFile', [
        'ngFileUpload',
        'ngMessages'
    ])
    .directive('ngSchemaFile', ['Upload', '$timeout', '$q', '$http', function (Upload, $timeout, $q, $http) {
        return {
            restrict: 'A',
            scope: true,
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                console.log("In ngSchemaFile directive");

                scope.url = scope.form && scope.form.endpoint;
                scope.authToken = scope.form && scope.form.authToken;
                scope.isSinglefileUpload = scope.form && scope.form.schema && scope.form.schema.format === 'singlefile';

                console.dir(scope);
                console.dir(scope.form);

                scope.selectFile = function (file) {
                    scope.picFile = file;
                    file && doUpload(file);
                };
                scope.selectFiles = function (files) {
                    scope.picFiles = files;
                    files.length && angular.forEach(files, function (file) {
                        doUpload(file);
                    });
                };

                scope.uploadFile = function (file) {
                    file && doUpload(file);
                };

                scope.uploadFiles = function (files) {
                    files.length && angular.forEach(files, function (file) {
                        doUpload(file);
                    });
                };

                function doUpload(file) {
                    console.log("In doUpload()");
                    console.dir(file);
                    console.dir(scope);
                    var cleanedFilename = file.name.replace(/[^\w\d\.]+/gi, "_");
                    console.log("Cleaned filename is: " + cleanedFilename);
                    if (file && !file.$error && scope.url) {
                        var query = {
                            filename: file.name,
                            type: file.type
                        };
                        $http({
                            method: "POST",
                            url: "https://" + scope.url,
                            data: query,
                            cache: false,
                            headers: {
                                "Content-Type": "application/json; charset=utf-8",
                                "X-Amp-Auth": scope.authToken
                            }
                        }).then(
                            function (response) {
                                console.log("SUCCESS!!!");
                                console.dir(response);
                                Upload.setDefaults({ngfMinSize: 100});
                                Upload.upload({
                                    url: response.data.url, //s3Url
                                    transformRequest: function (data, headersGetter) {
                                        var headers = headersGetter();
                                        delete headers.Authorization;
                                        return data;
                                    },
                                    fields: response.data.fields, //credentials
                                    method: 'POST',
                                    file: Upload.rename(file, cleanedFilename)
                                }).progress(function (evt) {
                                    file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                                    console.log('progress: ' + file.progress);
                                }).success(function (data, status, headers, config) {
                                    // File is uploaded successfully
                                    console.log('file ' + config.file.name + ' is uploaded successfully. Response: ' + data);
                                    // Extract the S3 URL for the image from the returned data
                                    var re = /\<Location\>https:\/\/(.*)\<\/Location\>/;
                                    var t1 = re.exec(data);
                                    var imageLocation = decodeURIComponent(t1[1]);
                                    var imagepath = imageLocation.split('s3.amazonaws.com/');
                                    console.dir(imagepath[1]);

                                    file.result = response.data;
                                    ngModel.$setViewValue(imagepath[1]);
                                    ngModel.$commitViewValue();
                                }).error(function () {
                                    console.log("UPLOAD ERROR!!!");
                                    console.dir(response);
                                    scope.errorMsg = response.status + ': ' + response.data;
                                });
                            },
                            function (response) {
                                console.log("SIGNING ERROR!!!");
                                console.dir(response);
                                scope.errorMsg = response.status + ': ' + response.data;
                            }
                        );
                    }




                    //     file.upload = Upload.upload({
                    //         url: scope.url,
                    //         file: file
                    //     });

                    //     file.upload.then(function (response) {
                    //         $timeout(function () {
                    //             file.result = response.data;
                    //         });
                            // ngModel.$setViewValue(response.data);
                            // ngModel.$commitViewValue();
                    //     }, function (response) {
                            // if (response.status > 0) {
                            //     scope.errorMsg = response.status + ': ' + response.data;
                            // }
                    //     });

                    //     file.upload.progress(function (evt) {
                    //         file.progress = Math.min(100, parseInt(100.0 *
                    //             evt.loaded / evt.total));
                    //     });
                    // }
                }

                scope.validateField = function () {
                    if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
                        console.log('singlefile-form is invalid');
                    } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
                        console.log('multifile-form is  invalid');
                    } else {
                        console.log('single- and multifile-form are valid');
                    }
                };
                scope.submit = function () {
                    if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
                        scope.uploadFile(scope.picFile);
                    } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
                        scope.uploadFiles(scope.picFiles);
                    }
                };
                scope.$on('schemaFormValidate', scope.validateField);
                scope.$on('schemaFormFileUploadSubmit', scope.submit);
            }
        };
    }]);
