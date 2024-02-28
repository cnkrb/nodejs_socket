const mysql = require("mysql2")

const pool2 = mysql.createPool({
    host: '31.192.212.112',
    user: 'cenkkar1_export',
    password: 'vf6U}oq9tg5N',
    database: 'cenkkar1_export',
});const mysql = require("mysql2")

const pool3 = mysql.createPool({
    host: '31.192.212.112',
    user: 'cenkkar1_fal',
    password: 'M=IM.Kv@z()]',
    database: 'cenkkar1_fal',
});

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fal',
});

const getConnection = function (callback) {
    pool3.getConnection(function (err, connection) {
        callback(err, connection);
    });
};

module.exports = getConnection
