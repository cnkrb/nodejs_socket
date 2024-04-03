const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const db = require('./database');
const {parse} = require("nodemon/lib/cli");

class Fortune {
    constructor(id, socketId, status, isAccept, username, name, mail, image, userCreateDate, selectedFortuneType,rank) {
        this.id = id;
        this.socketId = socketId;
        this.status = status;
        this.isAccept = isAccept;
        this.username = username;
        this.name = name;
        this.mail = mail;
        this.image = image;
        this.userCreateDate = userCreateDate;
        this.selectedFortuneType = selectedFortuneType;
        this.rank = rank;
    }
}

class Tail {
    constructor(fortuneId) {
        this.fortuneId = fortuneId;
        this.tails = [];
    }
    addTail(socketId) {
        this.tails.push(socketId);
    }
    removeTail(socketId) {
        this.tails = this.tails.filter(id => id !== socketId);
    }
}

const tails = [];

const searchRoom = "searchRoom";

io.on('connection', async (socket) => {

    socket.join(searchRoom);

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

    socket.on("searchFortuneRequest", async function (fortuneType,userId) {
        await getSocketToken(userId, async (err, userSocketToken) => {
            if (err) {} else {
                await searchFortune(fortuneType,async (err, results) => {
                    const fortunes = [];
                    for (let i = 0; i < results.length; i++) {
                        const result = results[i];
                        const index = tails.findIndex(tail => tail.fortuneId.toString() === result.id.toString());

                        fortunes.push(new Fortune(
                            parseInt(result.id),
                            result.socketId,
                            result.status,
                            result.isAccept,
                            result.username,
                            result.name,
                            result.mail,
                            result.image,
                            result.userCreateDate,
                            result.selectedFortuneType,
                            index === -1 ? "0" : tails[index].tails.length.toString()
                        ))
                    }

                    if (err) {} else {
                        io.to(userSocketToken).emit("searchFortune", {
                            fortuneType: fortuneType,
                            fortuneCount: fortunes.length > 0,
                            fortunes: fortunes
                        })
                    }
                });
            }
        });
    });

    socket.on("refreshTailRequest", async function (fortuneId,userId) {
        await getSocketToken(userId, async (err, userSocketToken) => {
            if (err) {
                io.to(userSocketToken).emit("addedTail", {
                    isSuccess: false,
                })
            } else {
                await getSocketTokenWithFortuneTeller(fortuneId, (err, fortuneSocketToken) => {
                    if (err) {
                        io.to(userSocketToken).emit("addedTail", {
                            isSuccess: false,
                        })
                    } else {
                        const index = tails.findIndex(tail => tail.fortuneId === fortuneId);
                        if (index !== -1) {
                            console.log(index)
                            console.log('burada')
                            const userTail = tails[index].tails.findIndex(tail => tail === userSocketToken);
                            io.to(fortuneSocketToken).emit("refreshTail", {
                                isSuccess: true,
                                rank: index === -1 ? "0" : tails[index].tails.length.toString(),
                            })
                            io.to(userSocketToken).emit("refreshTail", {
                                isSuccess: true,
                                rank: index === -1 ? "0" :  (userTail+1).toString(),
                            })
                        } else {
                            io.to(userSocketToken).emit("addedTail", {
                                isSuccess: false,
                            })
                        }
                    }
                });
            }
        });
    });

    socket.on("cameTailRequest", async function (fortuneId,userId) {
        await getSocketToken(userId, async (err, userSocketToken) => {
            if (err) {
                io.to(userSocketToken).emit("addedTail", {
                    isSuccess: false,
                })
            } else {
                await getSocketTokenWithFortuneTeller(fortuneId, (err, fortuneSocketToken) => {
                    if (err) {
                        io.to(userSocketToken).emit("addedTail", {
                            isSuccess: false,
                        })
                    } else {
                        const index = tails.findIndex(tail => tail.fortuneId === fortuneId);
                        if (index === -1) {
                            tails.push(new Tail(
                                fortuneId
                            ))
                            const index = tails.findIndex(tail => tail.fortuneId === fortuneId);

                            tails[index].addTail(userSocketToken)
                        } else {
                            tails[index].addTail(userSocketToken)
                        }

                        const userTail = tails[index].tails.findIndex(tail => tail === userSocketToken);
                        io.to(fortuneSocketToken).emit("addedTail", {
                            isSuccess: true,
                            userId: userId.toString(),
                            rank: index === -1 ? "0" : tails[index].tails.length.toString(),
                        })

                        io.to(userSocketToken).emit("addedTail", {
                            isSuccess: true,
                            userId: userId.toString(),
                            rank: index === -1 ? "0" :  (userTail+1).toString(),
                        })

                        io.to(searchRoom).emit("refresh", {});
                    }
                });
            }
        });
    });

    socket.on("cameTailRequestCancel", async function (fortuneId,userId) {
        await getSocketToken(userId, async (err, userSocketToken) => {
            if (err) {
                io.to(userSocketToken).emit("cancelTail", {
                    isSuccess: false,
                })
            } else {
                await getSocketTokenWithFortuneTeller(fortuneId, (err, fortuneSocketToken) => {
                    if (err) {
                        io.to(userSocketToken).emit("cancelTail", {
                            isSuccess: false,
                        })
                    } else {
                        const index = tails.findIndex(tail => tail.fortuneId === fortuneId);
                        if (index === -1) {
                            tails.push(new Tail(
                                fortuneId
                            ))
                            const index = tails.findIndex(tail => tail.fortuneId === fortuneId);
                            tails[index].removeTail(userSocketToken)
                        } else {
                            tails[index].removeTail(userSocketToken)
                        }

                        io.to(fortuneSocketToken).emit("cancelTail", {
                            isSuccess: true,
                            rank: index === -1 ? "0" : tails[index].tails.length.toString(),
                        })

                        io.to(userSocketToken).emit("cancelTail", {
                            isSuccess: true,
                        })

                        io.to(searchRoom).emit("refresh", {});
                    }
                });
            }
        });
    });

    socket.on("fortuneTellerSelected", async function (fortuneType,selectFortuneTellerId,userId) {
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


    socket.on("fortuneCloseRequest", async function (fortuneId,channelName) {
        await getSocketTokenWithChannelName(channelName, async (err, userId) => {
            if (err) {
            } else {
                await updateStatusWithFortune(1, fortuneId, async (err, updateGoldResult) => {
                    await getSocketToken(userId, async (err, userSocketToken) => {
                        if (err) {
                        } else {
                            const index = tails.findIndex(tail => tail.fortuneId === fortuneId);
                            tails[index].removeTail(userSocketToken)
                            io.to(userSocketToken).emit("fortuneClose", {})
                            io.to(searchRoom).emit("refresh", {});
                        }
                    });
                });
            }
        });
    });

    socket.on("fortuneStart", async function (selectUserId,userId,roomId,fortuneType) {
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
                await updateGold(selectUserId,  gold, userSocketToken, async (err, updateResult) => {
                    if (err) {
                        io.to(userSocketToken).emit("fortuneUserStart", {
                            isGold: false,
                            roomId: roomId.toString(),
                            userId: userId.toString(),
                        })
                    }
                    const index = tails.findIndex(tail => tail.fortuneId === userId);
                    if (index === -1) {
                        tails.push(new Tail(
                            userId
                        ))
                        const index = tails.findIndex(tail => tail.fortuneId === userId);
                        tails[index].addTail(userSocketToken)
                    } else {
                        tails[index].addTail(userSocketToken)
                    }

                    await updateStatusWithFortune(2, userId, async (err, updateGoldResult) => {
                        io.to(searchRoom).emit("refresh", {});
                        io.to(userSocketToken).emit("fortuneUserStart", {
                            isGold: true,
                            roomId: roomId.toString(),
                            userId: userId.toString(),
                        })
                    });

                });
            }
        });
    });

    socket.on("fortuneCancel", async function (selectUserId,userId) {
        await getSocketToken(selectUserId, (err, userSocketToken) => {
            if (err) {
            } else {
                io.to(userSocketToken).emit("fortuneFortuneCancel", {
                    roomId: 'test',
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

const getSocketTokenWithChannelName = (userId, result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        con.query("SELECT * FROM history WHERE roomId =  ?", [userId], (err, results) => {
            con.release();
            if (err) {
                result(err, null);
            } else {
                if (results.length > 0) {
                    result(null, results[0].userId);
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
const searchFortune = (selectedFortuneType,result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        const query = `SELECT * FROM fortune WHERE selectedFortuneType LIKE '%${selectedFortuneType}%'`;
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
                        result(err, null);
                        return;
                    }
                    if (updateGoldResult !== false) {
                        result(null, {
                            result: true,
                            message: ""
                        });
                    } else {
                        io.to(userSocketToken).emit("fortuneUserStart", {
                            isGold: false,
                            roomId: "roomId.toString()",
                            userId: "userId.toString()",
                        })
                    }
                });
            } else {
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

const updateStatusWithFortune = (status, fortuneId, result) => {
    db(function (err, con) {
        if (err) {
            result(err, null);
            return;
        }
        con.query("UPDATE fortune SET status = ? WHERE id = ?", [status, fortuneId], (err, updateGoldResult) => {
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



