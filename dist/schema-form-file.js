/**
 * angular-schema-form-nwp-file-upload - Upload file type for Angular Schema Form
 * @version v0.1.5
 * @link https://github.com/saburab/angular-schema-form-nwp-file-upload
 * @license MIT
 */
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

angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/nwp-file/nwp-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file ng-model=\"$$value$$\" name=\"uploadForm\">\n   <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\n      {{ form.title }}<i ng-show=\"form.required\">&nbsp;*</i>\n   </label>\n\n   <div ng-show=\"picFile\">\n      <div ng-include=\"\'uploadProcess.html\'\" class=\"mb\"></div>\n   </div>\n\n   <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\n      <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\n         <div ng-include=\"\'uploadProcess.html\'\"></div>\n      </li>\n   </ul>\n\n   <div class=\"well well-sm bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\n      <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\n      <div ng-if=\"isSinglefileUpload\" ng-include=\"\'singleFileUpload.html\'\"></div>\n      <div ng-if=\"!isSinglefileUpload\" ng-include=\"\'multiFileUpload.html\'\"></div>\n      <div class=\"help-block mb0\" ng-show=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\n      <div class=\"help-block mb0\" ng-show=\"(hasError() && errorMessage(schemaError()))\" ng-bind-html=\"(hasError() && errorMessage(schemaError()))\"></div>\n   </div>\n</ng-form>\n\n<script type=\'text/ng-template\' id=\"uploadProcess.html\">\n   <div class=\"row mb\">\n      <div class=\"col-sm-4 mb-sm\">\n         <label title=\"{{ \'modules.upload.field.preview\' | translate }}\" class=\"text-info\">{{\n            \'modules.upload.field.preview\' | translate }}</label>\n         <img ngf-src=\"picFile\" class=\"img-thumbnail img-responsive\">\n         <div class=\"img-placeholder\"\n              ng-class=\"{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}\">No preview\n            available\n         </div>\n      </div>\n      <div class=\"col-sm-4 mb-sm\">\n         <label title=\"{{ \'modules.upload.field.filename\' | translate }}\" class=\"text-info\">{{\n            \'modules.upload.field.filename\' | translate }}</label>\n         <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\n      </div>\n      <div class=\"col-sm-4 mb-sm\">\n         <label title=\"{{ \'modules.upload.field.progress\' | translate }}\" class=\"text-info\">{{\n            \'modules.upload.field.progress\' | translate }}</label>\n         <div class=\"progress\">\n            <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\"\n                 ng-class=\"{\'progress-bar-success\': picFile.progress == 100}\"\n                 ng-style=\"{width: picFile.progress + \'%\'}\">\n               {{ picFile.progress }} %\n            </div>\n         </div>\n         <!--\n         <button class=\"btn btn-primary btn-sm\" type=\"button\" ng-click=\"uploadFile(picFile)\"\n                 ng-disabled=\"!picFile || picFile.$error\">{{ \"buttons.upload\" | translate }}\n         </button>\n         -->\n      </div>\n   </div>\n   <div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\n      <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form.schema[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div>\n      <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\n      <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\n      <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ form.schema[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\n      <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">{{errorMsg}}</div>\n   </div>\n</script>\n\n<script type=\'text/ng-template\' id=\"singleFileUpload.html\">\n   <div ngf-drop=\"selectFile(picFile)\" ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\"\n        ng-model=\"picFile\" name=\"file\"\n        ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\n        ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\n        ng-required=\"form.required\"\n        accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\n        ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\n      <p class=\"text-center\">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p>\n   </div>\n   <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\n\n   <button ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\"\n           ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\n           ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\n           ng-required=\"form.required\"\n           accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\n           ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\"\n           class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\n      <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\n      {{ \"buttons.add\" | translate }}\n   </button>\n</script>\n\n<script type=\'text/ng-template\' id=\"multiFileUpload.html\">\n   <div ngf-drop=\"selectFiles(picFiles)\" ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\"\n        ng-model=\"picFiles\" name=\"files\"\n        ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\n        ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\n        ng-required=\"form.required\"\n        accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\n        ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\n      <p class=\"text-center\">{{ \'modules.upload.descriptionMultifile\' | translate }}</p>\n   </div>\n   <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\n\n   <button ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" multiple ng-model=\"picFiles\" name=\"files\"\n           accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\"\n           ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\n           ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\n           ng-required=\"form.required\"\n           ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\"\n           class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\n      <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\n      {{ \"buttons.add\" | translate }}\n   </button>\n</script>\n");}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzhFQ25PQSIsImZpbGUiOiJzY2hlbWEtZm9ybS1maWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIGFuZ3VsYXIgKi9cbid1c2Ugc3RyaWN0JztcblxuYW5ndWxhclxuICAgIC5tb2R1bGUoJ3NjaGVtYUZvcm0nKVxuICAgIC5jb25maWcoWydzY2hlbWFGb3JtUHJvdmlkZXInLCAnc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlcicsICdzZlBhdGhQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uIChzY2hlbWFGb3JtUHJvdmlkZXIsIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIsIHNmUGF0aFByb3ZpZGVyKSB7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdFBhdHRlcm5Nc2cgPSAnV3JvbmcgZmlsZSB0eXBlLiBBbGxvd2VkIHR5cGVzIGFyZSAnLFxuICAgICAgICAgICAgICAgIGRlZmF1bHRNYXhTaXplTXNnMSA9ICdUaGlzIGZpbGUgaXMgdG9vIGxhcmdlLiBNYXhpbXVtIHNpemUgYWxsb3dlZCBpcyAnLFxuICAgICAgICAgICAgICAgIGRlZmF1bHRNYXhTaXplTXNnMiA9ICdDdXJyZW50IGZpbGUgc2l6ZTonLFxuICAgICAgICAgICAgICAgIGRlZmF1bHRNaW5JdGVtc01zZyA9ICdZb3UgaGF2ZSB0byB1cGxvYWQgYXQgbGVhc3Qgb25lIGZpbGUnLFxuICAgICAgICAgICAgICAgIGRlZmF1bHRNYXhJdGVtc01zZyA9ICdZb3UgY2FuXFwndCB1cGxvYWQgbW9yZSB0aGFuIG9uZSBmaWxlLic7XG5cbiAgICAgICAgICAgIHZhciBud3BTaW5nbGVmaWxlVXBsb2FkID0gZnVuY3Rpb24gKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmIChzY2hlbWEudHlwZSA9PT0gJ2FycmF5JyAmJiBzY2hlbWEuZm9ybWF0ID09PSAnc2luZ2xlZmlsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5wYXR0ZXJuICYmIHNjaGVtYS5wYXR0ZXJuLm1pbWVUeXBlICYmICFzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0UGF0dGVybk1zZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1heFNpemUgJiYgc2NoZW1hLm1heFNpemUubWF4aW11bSAmJiAhc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heFNpemVNc2cxO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UyID0gZGVmYXVsdE1heFNpemVNc2cyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWluSXRlbXMgJiYgc2NoZW1hLm1pbkl0ZW1zLm1pbmltdW0gJiYgIXNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1pbkl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1pbkl0ZW1zTXNnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWF4SXRlbXMgJiYgc2NoZW1hLm1heEl0ZW1zLm1heGltdW0gJiYgIXNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heEl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heEl0ZW1zTXNnO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICBmLmtleSA9IG9wdGlvbnMucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgZi50eXBlID0gJ253cEZpbGVVcGxvYWQnO1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY2hlbWFGb3JtUHJvdmlkZXIuZGVmYXVsdHMuYXJyYXkudW5zaGlmdChud3BTaW5nbGVmaWxlVXBsb2FkKTtcblxuICAgICAgICAgICAgdmFyIG53cE11bHRpZmlsZVVwbG9hZCA9IGZ1bmN0aW9uIChuYW1lLCBzY2hlbWEsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ211bHRpZmlsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS5wYXR0ZXJuICYmIHNjaGVtYS5wYXR0ZXJuLm1pbWVUeXBlICYmICFzY2hlbWEucGF0dGVybi52YWxpZGF0aW9uTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLnBhdHRlcm4udmFsaWRhdGlvbk1lc3NhZ2UgPSBkZWZhdWx0UGF0dGVybk1zZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLm1heFNpemUgJiYgc2NoZW1hLm1heFNpemUubWF4aW11bSAmJiAhc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjaGVtYS5tYXhTaXplLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heFNpemVNc2cxO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heFNpemUudmFsaWRhdGlvbk1lc3NhZ2UyID0gZGVmYXVsdE1heFNpemVNc2cyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWluSXRlbXMgJiYgc2NoZW1hLm1pbkl0ZW1zLm1pbmltdW0gJiYgIXNjaGVtYS5taW5JdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1pbkl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1pbkl0ZW1zTXNnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2hlbWEubWF4SXRlbXMgJiYgc2NoZW1hLm1heEl0ZW1zLm1heGltdW0gJiYgIXNjaGVtYS5tYXhJdGVtcy52YWxpZGF0aW9uTWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NoZW1hLm1heEl0ZW1zLnZhbGlkYXRpb25NZXNzYWdlID0gZGVmYXVsdE1heEl0ZW1zTXNnO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICBmLmtleSA9IG9wdGlvbnMucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgZi50eXBlID0gJ253cEZpbGVVcGxvYWQnO1xuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY2hlbWFGb3JtUHJvdmlkZXIuZGVmYXVsdHMuYXJyYXkudW5zaGlmdChud3BNdWx0aWZpbGVVcGxvYWQpO1xuXG4gICAgICAgICAgICBzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyLmFkZE1hcHBpbmcoXG4gICAgICAgICAgICAgICAgJ2Jvb3RzdHJhcERlY29yYXRvcicsXG4gICAgICAgICAgICAgICAgJ253cEZpbGVVcGxvYWQnLFxuICAgICAgICAgICAgICAgICdkaXJlY3RpdmVzL2RlY29yYXRvcnMvYm9vdHN0cmFwL253cC1maWxlL253cC1maWxlLmh0bWwnXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgXSk7XG5cbmFuZ3VsYXJcbiAgICAubW9kdWxlKCduZ1NjaGVtYUZvcm1GaWxlJywgW1xuICAgICAgICAnbmdGaWxlVXBsb2FkJyxcbiAgICAgICAgJ25nTWVzc2FnZXMnXG4gICAgXSlcbiAgICAuZGlyZWN0aXZlKCduZ1NjaGVtYUZpbGUnLCBbJ1VwbG9hZCcsICckdGltZW91dCcsICckcScsICckaHR0cCcsIGZ1bmN0aW9uIChVcGxvYWQsICR0aW1lb3V0LCAkcSwgJGh0dHApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXG4gICAgICAgICAgICBzY29wZTogdHJ1ZSxcbiAgICAgICAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkluIG5nU2NoZW1hRmlsZSBkaXJlY3RpdmVcIik7XG5cbiAgICAgICAgICAgICAgICBzY29wZS51cmwgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uZW5kcG9pbnQ7XG4gICAgICAgICAgICAgICAgc2NvcGUuYXV0aFRva2VuID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLmF1dGhUb2tlbjtcbiAgICAgICAgICAgICAgICBzY29wZS5pc1NpbmdsZWZpbGVVcGxvYWQgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uc2NoZW1hICYmIHNjb3BlLmZvcm0uc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5kaXIoc2NvcGUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHNjb3BlLmZvcm0pO1xuXG4gICAgICAgICAgICAgICAgc2NvcGUuc2VsZWN0RmlsZSA9IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnBpY0ZpbGUgPSBmaWxlO1xuICAgICAgICAgICAgICAgICAgICBmaWxlICYmIGRvVXBsb2FkKGZpbGUpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc2NvcGUuc2VsZWN0RmlsZXMgPSBmdW5jdGlvbiAoZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUucGljRmlsZXMgPSBmaWxlcztcbiAgICAgICAgICAgICAgICAgICAgZmlsZXMubGVuZ3RoICYmIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvVXBsb2FkKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZSA9IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGUgJiYgZG9VcGxvYWQoZmlsZSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzLmxlbmd0aCAmJiBhbmd1bGFyLmZvckVhY2goZmlsZXMsIGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb1VwbG9hZChmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRvVXBsb2FkKGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJJbiBkb1VwbG9hZCgpXCIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIoc2NvcGUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2xlYW5lZEZpbGVuYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoL1teXFx3XFxkXFwuXSsvZ2ksIFwiX1wiKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDbGVhbmVkIGZpbGVuYW1lIGlzOiBcIiArIGNsZWFuZWRGaWxlbmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWxlICYmICFmaWxlLiRlcnJvciAmJiBzY29wZS51cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGUudHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogXCJodHRwczovL1wiICsgc2NvcGUudXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHF1ZXJ5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlgtQW1wLUF1dGhcIjogc2NvcGUuYXV0aFRva2VuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkudGhlbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTVUNDRVNTISEhXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVwbG9hZC5zZXREZWZhdWx0cyh7bmdmTWluU2l6ZTogMTAwfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVwbG9hZC51cGxvYWQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiByZXNwb25zZS5kYXRhLnVybCwgLy9zM1VybFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtUmVxdWVzdDogZnVuY3Rpb24gKGRhdGEsIGhlYWRlcnNHZXR0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGVhZGVycyA9IGhlYWRlcnNHZXR0ZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgaGVhZGVycy5BdXRob3JpemF0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkczogcmVzcG9uc2UuZGF0YS5maWVsZHMsIC8vY3JlZGVudGlhbHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogVXBsb2FkLnJlbmFtZShmaWxlLCBjbGVhbmVkRmlsZW5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLnByb2dyZXNzKGZ1bmN0aW9uIChldnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSBNYXRoLm1pbigxMDAsIHBhcnNlSW50KDEwMC4wICogZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3Byb2dyZXNzOiAnICsgZmlsZS5wcm9ncmVzcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24gKGRhdGEsIHN0YXR1cywgaGVhZGVycywgY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaWxlIGlzIHVwbG9hZGVkIHN1Y2Nlc3NmdWxseVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ZpbGUgJyArIGNvbmZpZy5maWxlLm5hbWUgKyAnIGlzIHVwbG9hZGVkIHN1Y2Nlc3NmdWxseS4gUmVzcG9uc2U6ICcgKyBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgdGhlIFMzIFVSTCBmb3IgdGhlIGltYWdlIGZyb20gdGhlIHJldHVybmVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZSA9IC9cXDxMb2NhdGlvblxcPmh0dHBzOlxcL1xcLyguKilcXDxcXC9Mb2NhdGlvblxcPi87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdDEgPSByZS5leGVjKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGltYWdlTG9jYXRpb24gPSBkZWNvZGVVUklDb21wb25lbnQodDFbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGltYWdlcGF0aCA9IGltYWdlTG9jYXRpb24uc3BsaXQoJ3MzLmFtYXpvbmF3cy5jb20vJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRpcihpbWFnZXBhdGhbMV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnJlc3VsdCA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoaW1hZ2VwYXRoWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5lcnJvcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVQTE9BRCBFUlJPUiEhIVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGlyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVycm9yTXNnID0gcmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU0lHTklORyBFUlJPUiEhIVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kaXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lcnJvck1zZyA9IHJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG5cblxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgZmlsZS51cGxvYWQgPSBVcGxvYWQudXBsb2FkKHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB1cmw6IHNjb3BlLnVybCxcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgZmlsZS51cGxvYWQudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIGZpbGUucmVzdWx0ID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuZ01vZGVsLiRzZXRWaWV3VmFsdWUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB9LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiAocmVzcG9uc2Uuc3RhdHVzID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBzY29wZS5lcnJvck1zZyA9IHJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBmaWxlLnVwbG9hZC5wcm9ncmVzcyhmdW5jdGlvbiAoZXZ0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IE1hdGgubWluKDEwMCwgcGFyc2VJbnQoMTAwLjAgKlxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgICBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKSk7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNjb3BlLnZhbGlkYXRlRmllbGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY29wZS51cGxvYWRGb3JtLmZpbGUgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlICYmICFzY29wZS5waWNGaWxlLiRlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZWZpbGUtZm9ybSBpcyBpbnZhbGlkJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlmaWxlLWZvcm0gaXMgIGludmFsaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUtIGFuZCBtdWx0aWZpbGUtZm9ybSBhcmUgdmFsaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGUoc2NvcGUucGljRmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyhzY29wZS5waWNGaWxlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHNjb3BlLiRvbignc2NoZW1hRm9ybVZhbGlkYXRlJywgc2NvcGUudmFsaWRhdGVGaWVsZCk7XG4gICAgICAgICAgICAgICAgc2NvcGUuJG9uKCdzY2hlbWFGb3JtRmlsZVVwbG9hZFN1Ym1pdCcsIHNjb3BlLnN1Ym1pdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfV0pO1xuIixudWxsXX0=
