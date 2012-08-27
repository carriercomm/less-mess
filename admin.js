$(function() {

    var header = [
        '     ___',
        '    /  /',
        '   /  /_____ _____ _____    ______ _____ _____ _____',
        '  /  // _  // ___// ___/   /     // _  // ___// ___/',
        ' /  // ___//__  //__  /   / / / // ___//__  //__  /',
        '/__//____//____//____/   /_/ /_//____//____//____/',
        '                                            ver. 0.1',
        'Copyright (c) 2012 Jakub Jankiewicz <http://jcubic.pl>',
        'Licensed under GNU LGPL Version 3 license'].join('\n') + '\n';
    rpc({
        url: "rpc.php",
        error: function(error) {
            var message;
            if (error.error) {
                message = error.error.message + '\n[' + error.error.at + '] ' + error.error.line;
            } else {
                message = error.message || error;
            }
            if ($.terminal) {
                $.terminal.resume();
                $.terminal.error(message);
            } else {
                alert(message);
            }
        }
    })(function(service) {
        window.log = $.proxy(console.log, console);
        window.dir = $.proxy(console.dir, console);
        window.service = service;
        $.terminal = $('#shell').terminal(function(command, term) {
            if (command == 'config') {
                term.pause();
                service.get_config(term.token())(function(config) {
                    term.resume();
                    terminal.echo(JSON.stringify(config));
                });
            } else if (command.match(/ *rpc */)) {
                // ----------------------------------------------------------
                // :: CALLING RPC METHODS
                // ----------------------------------------------------------
                function print(object) {
                    term.echo(JSON.stringify(object));
                }
                term.push(function(command, term) {
                    if (command != '') {
                        var args = command.replace(/^ +/, '').
                            replace(/\$token/, term.token()).split(/ +/);
                        if (typeof service[args[0]] == 'function') {
                            service[args[0]].apply(null, args.slice(1))(print);
                        } else {
                            term.error("Method '" + args[0] + "' not defined");
                        }
                    }
                }, {name: 'admin-rpc', prompt: 'rpc> '});
            } else if (command.match(/ *help */)) {
                term.echo("shell, js, mysql, python");
            } else if (command.match(/^ *echo/)) {
                term.echo(command.replace(/^ *echo */, ''));
            } else if (command.match(/^mysql/)) {
                var args = command.split(/ +/);
                term.push(function(command, term) {
                    if (command != 'clear') {
                        var params = [term.token(), command];
                        if (args.length > 1) {
                            params.push(args[1], args[2]);
                        }
                        service('mysql', params);
                    }
                }, {prompt: '[[;#5555FF;]mysql]> ', name: 'mysql'});
            } else if (command.match(/ *edit( .*|$)/)) {
                $.editor.show().refresh().focus();
                $.terminal.disable();
            } else if (command == 'shell') {
                var user_name = term.login_name();
                var home_dir = "/home/" + user_name;
                var pwd = home_dir;
                var last_dir = pwd;
                function execute(command) {
                    if (command.match(/ *cd *(-) */)) {
                        pwd = last_dir;
                        return;
                    }
                    term.pause();
                    $.getJSON("cgi-bin/cmd.py", {
                        token: term.token(),
                        command: command.replace(/(\\)?~/, function($0, $1) {
                            return $1 ? $0 : home_dir;
                        }),
                        path: pwd
                    }, function(response) {
                        if (response.error) {
                            term.error(response.error)
                        } else {
                            term.echo(response.result.stdout);
                            pwd = response.result.cwd;
                        }
                        term.resume();
                    });
                }
                execute('bash --version');
                term.push(function(command) {
                    if (command != '') {
                        execute(command);
                    }
                }, {
                    prompt: function(callback) {
                        var username = '[[;#44D544;]' + user_name + ']';
                        var re = new RegExp("^" + home_dir);
                        var path = '[[;#5555FF;]' + pwd.replace(re, '~') + ']';
                        callback(username + '[[;#989898;]:]' + path + '[[;#989898;]$] ');
                    },
                    name: 'shell'
                });
            } else if (command == 'js') {
                term.push(function(command, term) {
                    if (command !== undefined && command !== '') {
                        try {
                            var result = window.eval(command);
                            if (result !== undefined) {
                                term.echo(new String(result));
                            }
                        } catch(e) {
                            term.error(new String(e));
                        }
                    }
                }, {prompt: '[[;#D72424;]js]> ', name: 'js'});
            } else {
                if (command != '') {
                   term.error('unknown command "' + command + '"');
                }
            }
        }, {
            onBeforelogout: function(term) {
                service.logout(term.token())($.noop);
            },
            login: function(user, passwd, finalize) {
                service.login(user, passwd)(finalize);
            },
            onBeforeLogin: function(term) {
                term.echo(header);
                // test if token is valid
                var token = term.token();
                if (token) {
                    service.valid_token(term.token())(function(valid) {
                        if (!valid) {
                            term.error("Terminal save invalid session");
                            term.logout(term.token());
                        }
                    });
                }
            },
            name: 'admin',
            greetings: null
        }).css({overflow: 'auto'});
        
        // SETUP EDITOR
        
        // return function that alway return the same value
        _.always = function(value) {
            return function() {
                return value;
            };
        };
        // check if element is in the array
        _.has = function(list, name) {
            return _.indexOf(list, name) != -1;
        };
        // create object with forced context that never change even if you
        // call it out of context, so you can pass method as callback that
        // rely on object context like:
        //     _.each([1,2,3,4], _.context(console).log)
        _.context = function(object, context) {
            var new_object = {};
            for (var name in object) {
                (function(name) {
                    if (typeof object[name] == 'function') {
                        new_object[name] = function() {
                            return object[name].apply(context||object, _.toArray(arguments));
                        };
                    } else {
                        new_object[name] = object[name];
                    }
                })(name);
            }
            return new_object;
        };
        //jQuerieze CodeMirror Object
        (function(editor) {
            $.editor = $(editor.getWrapperElement());
            for (var name in editor) {
                (function(name) {
                    if (typeof editor[name] == 'function') {
                        $.editor[name] = function() {
                            var ret = editor[name].apply($.editor, _.toArray(arguments));
                            return ret || $.editor;
                        };
                    } else {
                        $.editor[name] = editor[name];
                    }
                })(name);
            }
        })(CodeMirror($('#editor')[0], {
            lineNumbers: true,
            keyMap: 'basic',
            onKeyEvent: function(editor, event) {
                var extra = event.ctrlKey || event.metaKey || event.altKey;
                if (event.ctrlKey) {
                    if (event.keyCode == 88) { // ctrl+x
                        $.Event(event).preventDefault();
                    }
                }
                return event.ctrlKey || event.metaKey || event.altKey;
            }
        }));
        $.lessmess = {};
        $.editor.styles = ['ambiance', 'blackboard', 'cobalt', 'eclipse',
                           'elegant', 'erlang-dark', 'lesser-dark', 'monokai',
                           'neat', 'night', 'rubyblue', 'vibrant-ink',
                           'xq-dark'];
        (function() {
            var path = 'libs/CodeMirror/theme/';
            $.editor.style = function(name) {
                if (!_.has($.editor.styles, name)) {
                    throw ('"' + name + '" is invalid style name');
                }
                if (!$('style#' + name).length) {
                    $('<link/>').attr({
                        rel: 'stylesheet',
                        id: name,
                        href: path + name + '.css'
                    }).appendTo('head');
                }
                $.editor.setOption('theme', name);
                return $.editor;
            };
            var ti = 0;
            $.editor.style.next = function() {
                $.editor.style($.editor.styles[ti++ % $.editor.styles.length]);
                return $.editor;
            };
        })();

        $.editor.style('vibrant-ink').hide();
        // enable mousetrap when CodeMirror is enabled
        $.editor.find('textarea:not(.clipboard)').addClass('mousetrap');
        $.editor.kill_ring = [];

        Mousetrap.bind("ctrl+x ctrl+f", function() {
            service.file($.terminal.token(), 'rpc.php')(function(file) {
                $.editor.setValue(file);
            });
            return false;
        });
        Mousetrap.bind("ctrl+x ctrl+e", function() {
            try {
                eval($.editor.getSelection());
            } catch (e) {
                // message
            }
            return false;
        });
        Mousetrap.bind("ctrl+w", function() {
            
            return false;
        });
        Mousetrap.bind("alt+w", function() {
            $.editor.kill_ring.push($.editor.getSelection());
        });
        Mousetrap.bind("ctrl+y", function() {
            $.editor.replaceSelection(_.last($.editor.kill_ring));
        });
        Mousetrap.bind("ctrl+f", function() {
            return false;
        });
        
        Mousetrap.bind("ctrl+c ctrl+a", function() {
            return false;
        });
        // SETUP KEY BINDING
        Mousetrap.bind("ctrl+x ctrl+c", function() {
            return false;
        });
        
        //there where some issues with cross-browser CSS only resize
        $(window).resize(function() {
            var win_height = $(window).height();
            $.terminal.css('height', win_height-20);
            $($.editor.getScrollerElement()).css('height', win_height)
            $.editor.refresh();
        }).resize();
    }); // rpc
});
