const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const db = require('./database');

io.on('connection', async (socket) => {

    socket.on("connectUser", async function (userName) {
        await getSocketToken(userName, (err, results) => {
            if (err) {
            } else {
                console.log(results)
            }
        });
    });

    socket.on("fortuneRequest", async function (fortuneType,userId) {
        await getSocketToken(userId, async (err, userSocketToken) => {
            if (err) {} else {
                await getUsersWithSocketIdAndStatus(async (err, results) => {
                    if (err) {} else {
                        io.to(userSocketToken).emit("fortuneCallBack", {
                            fortuneType: fortuneType,
                            usersCount: results.length > 0,
                            users: results
                        })
                    }
                });
            }
        });
    });

    socket.on("fortuneTellerSelected", async function (fortuneType,selectFortuneTellerId,userId) {
        console.log(selectFortuneTellerId,userId)
        await getSocketTokenWithFortuneTeller(selectFortuneTellerId, (err, fortuneSocketToken) => {
            if (err) {
            } else {
                io.to(fortuneSocketToken).emit("fortuneTellerCallBack", {
                    fortuneType: fortuneType,
                    userId: userId.toString(),
                })
            }
        });
    });

    socket.on("fortuneStart", async function (selectUserId,userId,roomId,fortuneType) {
        await getSocketToken(selectUserId, async (err, userSocketToken) => {
            if (err) {
            } else {
                let gold = 0;
                if (fortuneType.equals("Kahve")) {
                    gold = 5 ;
                } else if (fortuneType.equals("Tarot")) {
                    gold = 10 ;
                } else if (fortuneType.equals("Pandul")) {
                    gold = 15 ;
                } else if (fortuneType.equals("İskambil")) {
                    gold = 20 ;
                } else if (fortuneType.equals("Bakla")) {
                    gold = 25 ;
                }
                await updateGold(userId,  gold, "test", "tes", (err, updateResult) => {
                    if (err) {
                        io.to(userSocketToken).emit("fortuneUserStart", {
                            isGold: false,
                            roomId: roomId.toString(),
                            userId: userId.toString(),
                        })
                    }
                    io.to(userSocketToken).emit("fortuneUserStart", {
                        isGold: true,
                        roomId: roomId.toString(),
                        userId: userId.toString(),
                    })
                });
            }
        });
    });

    socket.on("fortuneCancel", async function (selectUserId,userId) {
        await getSocketToken(selectUserId, (err, userSocketToken) => {
            if (err) {
            } else {
                io.to(userSocketToken).emit("fortuneFortuneCancel", {
                    cancel: true,
                })
            }
        });
    });
});


const getSocketToken = (userId, result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        con.query("SELECT * FROM user WHERE id =  ?", [userId], (err, results) => {
            con.release();
            if (err) {
                result(err, null);
            } else {
                if (results.length > 0) {
                    result(null, results[0].socketId);
                } else {
                    result("Kullanıcı bulunamadı", null);
                }
            }
        });
    });
}

const getSocketTokenWithFortuneTeller = (userId, result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        con.query("SELECT socketId FROM fortune WHERE id =  ?", [userId], (err, results) => {
            con.release();
            if (err) {
                result(err, null);
            } else {
                if (results.length > 0) {
                    result(null, results[0].socketId);
                } else {
                    result("Kullanıcı bulunamadı", null);
                }
            }
        });
    });
}

const getUsersWithSocketIdAndStatus = (result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        const query = "SELECT * FROM fortune WHERE socketId <> '0' AND status = '1'";
        con.query(query, (err, results) => {
            con.release();
            if (err) {
                result(err, null);
            } else {
                result(null, results);
            }
        });
    });
}

// Veritabanından kullanıcının altın miktarını alır ve gerekli işlemleri gerçekleştirir
const updateGold = (userId, gold, messageSuccess, messageErrorGold, messageErrorNotGold, result) => {
    // Kullanıcının mevcut altın miktarını al
    getGold(userId, (err, currentGold) => {
        if (err) {
            result(err, null);
            return;
        }


        if (currentGold !== false) {
            if (currentGold >= gold) {
                // Yeni altın miktarını hesapla
                const newGoldValue = currentGold - gold;

                // Altını güncelle
                updateGoldInDatabase(newGoldValue, userId, (err, updateGoldResult) => {
                    if (err) {
                        result(err, null);
                        return;
                    }

                    if (updateGoldResult !== false) {
                        result(null, {
                            result: true,
                            message: messageSuccess
                        });
                    } else {
                        result(null, {
                            result: false,
                            message: messageErrorGold
                        });
                    }
                });
            } else {
                result(null, {
                    result: false,
                    message: messageErrorNotGold
                });
            }
        }
    });
}

// Kullanıcının mevcut altın miktarını alır
const getGold = (userId, result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        con.query("SELECT gold FROM user WHERE id =  ?", [userId], (err, results) => {
            con.release();
            if (err) {
                result(err, null);
            } else {
                if (results.length > 0) {
                    result(null, results[0].gold);
                } else {
                    result("Kullanıcı bulunamadı", null);
                }
            }
        });
    });
}

// Veritabanında kullanıcının altın miktarını günceller
const updateGoldInDatabase = (newGoldValue, userId, result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        con.query("UPDATE user SET gold = ? WHERE id = ?", [newGoldValue, userId], (err, updateGoldResult) => {
            con.release();
            if (err) {
                result(err, null);
            } else {
                result(null, updateGoldResult);
            }
        });
    });
}



server.listen(2121, () => {
    console.log('2121 portunu dinliyorum...')
});


