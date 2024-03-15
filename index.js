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
        console.log(selectUserId,userId)
        await getSocketToken(selectUserId, async (err, userSocketToken) => {
            if (err) {
            } else {
                let gold = 0;
                if (fortuneType === "Kahve") {
                    gold = 5 ;
                } else if (fortuneType === ("Tarot")) {
                    gold = 10 ;
                } else if (fortuneType === ("Pandul")) {
                    gold = 15 ;
                } else if (fortuneType === ("İskambil")) {
                    gold = 20 ;
                } else if (fortuneType === ("Bakla")) {
                    gold = 25 ;
                }
                await updateGold(selectUserId,  gold, userSocketToken, (err, updateResult) => {
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
const updateGold = (userId, gold, userSocketToken, result) => {
    getGold(userId, (err, currentGold) => {
        if (err) {
            result(err, null);
            return;
        }
        if (currentGold !== 0) {
            if (currentGold >= gold) {
                const newGoldValue = currentGold - gold;
                updateGoldInDatabase(newGoldValue, userId, (err, updateGoldResult) => {
                    if (err) {
                        console.log('girdi2')
                        result(err, null);
                        return;
                    }
                    if (updateGoldResult !== false) {
                        console.log('girdi3')
                        result(null, {
                            result: true,
                            message: ""
                        });
                    } else {
                        console.log('girdi4')
                        io.to(userSocketToken).emit("fortuneUserStart", {
                            isGold: false,
                            roomId: "roomId.toString()",
                            userId: "userId.toString()",
                        })
                    }
                });
            } else {
                console.log('girdi5')
                io.to(userSocketToken).emit("fortuneUserStart", {
                    isGold: false,
                    roomId: "roomId.toString()",
                    userId: "userId.toString()",
                })
            }
        } else {
            io.to(userSocketToken).emit("fortuneUserStart", {
                isGold: false,
                roomId: "roomId.toString()",
                userId: "userId.toString()",
            })
        }
    });
}

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



server.listen(8080, () => {
    console.log('8080 portunu dinliyorum...')

});


