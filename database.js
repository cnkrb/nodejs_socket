const mysql = require("mysql2")

const pool = mysql.createPool({
    host: '31.192.212.112',
    user: 'cenkkar1_fal',
    password: 'M=IM.Kv@z()]',
    database: 'cenkkar1_fal',
});

const getConnection = function (callback) {
    pool.getConnection(function (err, connection) {
        callback(err, connection);
    });
};

module.exports = getConnection
