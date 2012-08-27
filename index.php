<!DOCTYPE HTML>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8" />
    <title>Shell</title>
    <link rel="shortcut icon" href="favicon.ico"/>
    <link href="libs/terminal/css/jquery.terminal.css" rel="stylesheet"/>
    <!--[if IE]>
    <script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
    <![endif]-->
    <style>
    .terminal a.ui-slider-handle:focus { outline: none; }
    body { margin: 0; padding: 0; }
    html { background-color: #000; }
    .clear { clear: both; }
    /* This works only in Safari and Google Chrome */
    @media screen and (-webkit-min-device-pixel-ratio:0) {
        .terminal, .terminal .terminal-output, .terminal .terminal-output div,
        .terminal .terminal-output div div, .cmd, .terminal .cmd span, .terminal .cmd div {
            font-weight: bold;
        }
    }
    .CodeMirror {
        width: 100%;
        height: 100%;
        position: absolute !important;
        top: 0;
        left: 0;
    }
    </style>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="libs/terminal/js/jquery-1.7.1.min.js"></script>
    <script src="libs/underscore/underscore-min.js"></script>
    <script src="libs/json-rpc/json-rpc.js"></script>
    <script src="libs/mousetrap/mousetrap.js"></script>
    <script src="libs/terminal/js/jquery.mousewheel-min.js"></script>
    <script src="libs/terminal/js/jquery.terminal-min.js"></script>
    <script src="libs/CodeMirror/lib/codemirror.js"></script>
    <link rel="stylesheet" href="libs/CodeMirror/lib/codemirror.css"/>
    <script src="admin.js"></script>
</head>
<body>
  <div id="shell"></div>
  <div id="editor"></div>
</body>
</html>
