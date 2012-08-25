<?php

require('libs/json-rpc/json-rpc.php');
require('libs/Database.php');

class User {
    function __construct($username, $password) {
        $this->username = $username;
        $this->password = $password;
    }
}



class Session {
    private $storage;
    private $token;
    private $username;
    private function __construct($username, $token, $storage) {
        $this->storage = $storage;
        $this->token = $token;
        $this->username = $username;
    }
    function username() {
        return $this->username;
    }
    function token() {
        return $this->token;
    }
    function __get($name) {
        return $this->storage->$name;
    }
    function __set($name, $value) {
        $this->storage->$name = $value;
    }
    function __isset($name) {
        return isset($this->storage->$name);
    }
    static function create_sessions($sessions) {
        $result = array();
        foreach ($sessions as $session) {
            $result[] = new Session($session->username,
                                    $session->token,
                                    $session->storage);
        }
        return $result;
    }
    static function new_session($username) {
        $token = sha1(array_sum(explode(' ', microtime())));
        return new Session($username, $token, new stdClass());
    }
}


class Service {

    protected $config_file;
    protected $config;
    const password_crypt = 'sha1';
    const password_regex = '/([A-Za-z_][A-Za-z0-9_]+):(.*)/';

    function __construct($config_file) {
        $this->config_file = $config_file;
        if (file_exists($config_file)) {
            try {
                $this->config = json_decode(file_get_contetns($config_file));
            } catch (Exception $e) {
                $this->config = new stdClass();
            }
        } else {
            $this->config = new stdClass();
        }
        if (!isset($this->config->sessions)) {
            $this->config->sessions = array();
        }
        if (!isset($this->config->users)) {
            $this->config->users = array();
        }
    }

    function __destruct() {
        $this->__write($this->config_file, json_encode($this->config));
    }

    // -----------------------------------------------------------------
    // UTILS
    // -----------------------------------------------------------------
    private function get_user($username) {
        $index = $this->get_user_index($username);
        return $index == -1 ? null : $this->config->users[$index];
    }

    // -----------------------------------------------------------------
    private function get_user_index($username) {
        foreach($this->config->users as $i => $user) {
            if ($username == $user['username']) {
                return $i;
            }
        }
        return -1;
    }

    // -----------------------------------------------------------------
    // SESSIONS
    // -----------------------------------------------------------------
    private function new_session($username) {
        return $this->config->sessions[] = Session::new_session($username);
    }

    // -----------------------------------------------------------------
    private function delete_session($token) {
        //need index to unset and indexes may not be sequential
        foreach (array_keys($this->config->sessions) as $i) {
            if ($token == $this->config->sessions[$i]->token()) {
                unset($this->config->sessions[$i]);
            }
        }
    }
    // -----------------------------------------------------------------
    private function get_session($token) {
        foreach ($this->config->sessions as $session) {
            if ($token == $session->token()) {
                return $session;
            }
        }
        return null;
    }
    // -----------------------------------------------------------------
    public function get_username($token) {
        $session = $this->get_session($token);
        return $session ? $session->name : null;
    }

    // -----------------------------------------------------------------
    private function get_session($token) {
        foreach ($this->config->sessions as $session) {
            if ($session->token == $token) {
                return $session;
            }
        }
        return null;
    }


    // -----------------------------------------------------------------
    private function __write($filename, $content) {
        if (!file_exists($filename)) {
            throw new Exception("File '$filename' don't exists");
        }
        if (!is_writable($filename)) {
            throw new Exception("You don't have write permission to file '$filename'");
        }
        $file = fopen($filename, 'w');
        if (!$file) {
            throw new Exception("Couldn't open file '$filename' for write");
        }
        fwrite($file, $content);
        fclose($file);
    }



    // -----------------------------------------------------------------
    public function valid_token($token) {
        return $this->get_session($token) != null;
    }

    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    function login($username, $password) {
        $user = $this->get_user($username);
        if (!$user) {
            throw new Exception("'$username' is invalid username");
        }
        if (!$user['password']) {
            throw new Exception("Password for user '$username' not set");
        }
        preg_match, $user['password'], $match);
        if (!$match) {
            throw new Exception("Password for user '$username' have invalid format");
        }
        if ($match[2] == call_user_func($match[1], $password)) {
            return $this->new_session($username)->token();
        } else {
            throw new Exception("Password for user '$username' is invalid");
        }
    }

    private function create_session($username) {
        $this->config->sessions[] = new 
    }


    // -----------------------------------------------------------------
    public function session_set($token, $name, $value) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        $session = $this->get_session($token);
        $session->session->
        $this->config->session[$this->get_username()][$name] = $value;
    }

    // -----------------------------------------------------------------
    public function store_user_data($token, $name, $value) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        if ($name == 'name' || $name == 'password') {
            throw new Exception("You can't store '$name'");
        }
        $this->config->users[$this->get_user_index()]->$name = $value;
    }

    // -----------------------------------------------------------------
    public function session_get($token, $name) {
        return $this->config['session'][$this->get_username()][$name];
    }

    // -----------------------------------------------------------------
    // for client convient all functions have token - in this case it's ignored
    public function file($token, $filename) {
        if (!file_exists($filename)) {
            throw new Exception("File '$filename' don't exists");
        }
        return file_get_contents($filename);
    }

    // -----------------------------------------------------------------
    public function write($token, $filename, $content) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        $this->__write($filename, $content);
    }



    // -----------------------------------------------------------------
    // ADMIN
    // -----------------------------------------------------------------
    private function create_admin_password($password) {
        $password = call_user_func(self::password_crypt, $password);
        $this->config->users[] =
                new User('admin', self::password_crypt . ':' . $password);
    }
    // executed when config file don't exists
    public function set_admin_password($password) {
        if (file_exists($this->config_file)) {
            throw new Exception("File '" . $this->config_file . "' exists, you ".
                "can set admin password only once");
        }
        $this->create_admin_password($password);
    }

    // -----------------------------------------------------------------
    private function validate_admin($token) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        if ($this->get_session($token)->username != 'admin') {
            throw new Exception("Only Admin can create new account");
        }
    }

    // -----------------------------------------------------------------
    public function add_user($token, $username, $password) {
        $this->validate_admin($token);
        $this->config->users[] = new User($username, $password);
    }

    // -----------------------------------------------------------------
    public function remove_user($token, $username, $password) {
        $this->validate_admin($token);
        if (($idx = $this->get_user_index($this->get_username($token))) == -1) {
            throw new Exception("User '$username' don't exists");
        }
        if ($this->config->users[] = new User($username, $password);
        
        // remove session
        foreach($this->config->tokens as $token => $token_username) {
            if ($username == $token_username) {
                unset($this->config->tokens[$token]);
            }
        }
        // remove sessions
        foreach($this->config->sessions as $token => $session) {
            if ($username == $token_username) {
                unset($this->config->tokens[$token]);
            }
        }
    }
    
    // -----------------------------------------------------------------
    public function list_users($token) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        return array_map(function($user) {
            return $user->name;
        }, $this->config->users);
    }

    // -----------------------------------------------------------------
    public function change_password($token, $password) {
        
    }

    // -----------------------------------------------------------------
    public function logout($token) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        $this->delete_session($token);
    }

    private function mysql_create_connection($host, $username, $password, $db) {
        return $this->mysql_connection = new Database($host, $username, $password, $db);
    }

    public function mysql_connect($token, $host, $username, $password, $db) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        $this->mysql_create_connection($host, $username, $password, $db);
        $session = $this->get_session($token);
        $session->db_host = $host;
        $session->db_user = $username;
        $session->db_pass = $password;
        $session->db_name = $db;
    }

    // -----------------------------------------------------------------
    private function mysql_connection_from_session($session) {
        if (!(isset($session->db_host) && isset($session->db_user) &&
              isset($session->db_pass) && isset($session->db_name)) {
            throw new Exception("You need to connect to database first" .
                " so your database info will be stored in session");
        }
        $db = $this->mysql_create_connection($session->db_host,
                                             $session->db_user,
                                             $session->db_pass,
                                             $session->db_name);
    }

    // -----------------------------------------------------------------
    public function mysql($token, $query) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        $session = $this->get_session($token);
        $db = mysql_connection_from_session($token);
        return $db->get_array($query);
    }

    // -----------------------------------------------------------------
    public function shell($token, $code) {
        if (!$this->valid_token($token)) {
            throw new Exception("Access Denied: Invalid Token");
        }
        return file_get_contents("http://jcubic.pl/cgi-bin/cmd?" . urlencode($code));
    }
}


handle_json_rpc(new Service());

?>
