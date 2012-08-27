jQuery(function($) {
    var header = [
        '    _       _           _         _____           _ ',
        '   / \\   __| |_ __ ___ (_)_ __   |_   _|__   ___ | |',
        '  / _ \\ / _` | \'_ ` _ \\| | \'_ \\    | |/ _ \\ / _ \\| |',
        ' / ___ \\ (_| | | | | | | | | | |   | | (_) | (_) | |',
        '/_/   \\_\\__,_|_| |_| |_|_|_| |_|   |_|\\___/ \\___/|_|',
        '                                            ver. 0.1',
        'Copyright (c) 2012 Jakub Jankiewicz <http://jcubic.pl>',
        'Licensed under GNU LGPL Version 3 license'].join('\n') + '\n';
    var terminal;
    rpc({
        url: "rpc.php",
        error: function(error) {
            var message;
            if (error.error) {
                message = error.error.message + '\n[' + error.error.at + '] ' + error.error.line;
            } else {
                message = error.message || error;
            }
            if (terminal) {
                terminal.resume();
                terminal.error(message);
            } else {
                alert(message);
            }
        }
    })(function(service) {
        window.log = $.proxy(console.log, console);
        window.dir = $.proxy(console.dir, console);
        window.service = service;
        window.terminal = terminal = $('#shell').terminal(function(command, term) {
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

        //there where some issues with cross-browser CSS only resize
        $(window).resize(function() {
            terminal.css('height', $(window).height()-20);
        }).resize();

        // SETUP EDITOR
        
        // SETUP KEY BINDING
        Mousetrap.bind("ctrl+x ctrl+f", function() {
            return false;
        });

    }); // rpc
});
