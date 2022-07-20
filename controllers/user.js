const jwt = require('jsonwebtoken');
const { post } = require('../routes/user');


const pool = require('../db').getPool();

exports.getQuestions = async (req, res) => {
    pool.query('SELECT posts.post_title, posts.post_body, users.username, posts.post_id, post_date, posts.isArchived, posts.isDeletedByAdmin FROM posts JOIN users ON user_id = poster_id', (err, result) => {
        if (err) throw err;
        const ids = result.map(res => res.post_id);
        if (result.length > 0) {
            pool.query('SELECT SUM (rating) AS rating, post_id FROM likes WHERE post_id IN (?) GROUP BY post_id', [ids], (err, result2) => {
                if (err) throw err;
                const posts = result.map(post => {
                    const rating = result2.find(res => res.post_id === post.post_id);
                    const time = post.post_date.toLocaleString();
                    const like_amount = rating ? rating.rating : 0;
                    return { ...post, like_amount: like_amount, post_date: time }
                })
                res.send(posts)
            })
        }
    })
}

exports.addQuestion = async (req, res) => {

    let token, decoded;

    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = token && jwt.verify(token, process.env.JWT_SECRET);
        const createDate = new Date();
        const { title, body } = req.body;
        if (decoded) {
            const ID = decoded.user.user_id;
            pool.query('INSERT INTO posts SET poster_id = ?, post_title = ?, post_body = ?, post_date = ?', [ID, title, body, createDate], (err, result) => {
                if (err) throw err;
                res.status(200).send({ id: result.insertId });
            })
        } else {
            res.status(401).send({ error: 'You must be logged in to post a question' })
        }
    } catch (err) {
        console.log(err)
        return res.status(401).send({ error: 'You must be logged in to post a question' })
    }

}

exports.editQuestion = async (req, res) => {
    let token, decoded;

    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err)
        return res.status(401).send({ error: 'You must be logged in to edit a question' })
    }
    const USER_ID = decoded.user.user_id;
    const POST_ID = req.params.id;
    const { title, body } = req.body;
    const edit_date = new Date();

    pool.query('UPDATE posts SET post_title = ?, post_body = ?, wasEdited = ?, edit_date = ? WHERE poster_id = ? AND post_id = ?', [title, body, true, edit_date, USER_ID, POST_ID], (err, result) => {
        if (err) throw err;
        res.status(200).send({ id: POST_ID })
    })
}

exports.getProfile = async (req, res) => {
    let token, decoded;

    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err)
        return res.status(401).send({ error: 'You must be logged in to view your profile' })
    }
    const ID = decoded.user.user_id;

    pool.query('SELECT posts.post_id, users.username, posts.post_title, posts.post_body, posts.isArchived, posts.isDeletedByAdmin FROM posts JOIN users ON user_id = poster_id AND user_id = ?', [ID], (err, result) => {
        if (err) throw err;
        res.status(200).send(result);

    })
}

exports.getQuestion = async (req, res) => {

    const ID = req.params.id;
    let token, decoded;
    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = token && jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err)
        return res.status(401).send({ error: 'You must be logged in to view your profile' })
    }


    pool.query('SELECT posts.post_title, posts.post_body, users.username, posts.post_id, posts.post_date, posts.wasEdited, posts.isArchived, posts.edit_date, posts.isDeletedByAdmin, posts.poster_id FROM posts JOIN users ON user_id = poster_id AND post_id = ?', [ID], (err, result) => {
        if (err) throw err;
        const POSTER_ID = result[0].poster_id;
        pool.query('SELECT SUM (rating) AS rating FROM likes WHERE post_id = ?', [ID], (err, result2) => {
            if (err) throw err;
            if (decoded) {
                const USER_ID = decoded.user.user_id
                const post = result.map(post => {
                    const rating = result2[0].rating;
                    const time = post.post_date.toLocaleString();
                    const editTime = post.edit_date.toLocaleString();
                    return { ...result[0], like_amount: rating, post_date: time, edit_date: editTime }
                })
                if (POSTER_ID === USER_ID) {
                    res.status(200).send({ ...post, isEditable: true });
                } else {
                    res.status(200).send(post);
                }
            } else {
                const post = result.map(post => {
                    const rating = result2[0].rating;
                    const time = post.post_date.toLocaleString();
                    const editTime = post.edit_date.toLocaleString();
                    return { ...result[0], like_amount: rating, post_date: time, edit_date: editTime }
                })
                    res.status(200).send(post)
            }
        })
    })
}


exports.rating = async (req, res) => {
    const rating = Math.min(Math.max(req.body.rating, -1), 1);
    const post_id = req.body.id;
    let token, decoded;

    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = token && jwt.verify(token, process.env.JWT_SECRET);
        if (decoded) {
            const user_id = decoded.user.user_id;
            pool.query('UPDATE likes SET rating = ? WHERE post_id = ? AND user_id = ?', [rating, post_id, user_id], (err, result) => {
                if (err) throw err;
                if (result.affectedRows < 1) {
                    pool.query('INSERT INTO likes SET rating = ?, post_id = ?, user_id = ?', [rating, post_id, user_id], (err, result) => {
                        if (err) throw err;
                    })
                }
            })
            pool.query('SELECT SUM (rating) AS rating FROM likes WHERE post_id = ?', [post_id], (err, result) => {
                if (err) throw err;
                res.send(result[0].rating);
            })
        } else {
            return res.status(401).send({ error: 'You must be logged in to rate' })
        }
    } catch (err) {
        console.log(err)
    }

}

exports.addAnswer = async (req, res) => {
    let token, decoded;

    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err)
        return res.status(401).send({ error: 'You must be logged in to post an answer' })
    }
    const ID = decoded.user.user_id;
    const POST_ID = req.params.id;
    const createDate = new Date();
    const { body } = req.body;
    pool.query('INSERT INTO answers SET answerer_id = ?, answer_body = ?, post_date = ?, post_id = ?', [ID, body, createDate, POST_ID], (err, result) => {
        if (err) throw err;
        res.status(200).send({ id: POST_ID });
    })
}

exports.getAnswers = async (req, res) => {
    const ID = req.params.id;

    let token, decoded;
    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = token && jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err)
        return res.status(401).send({ error: 'You must be logged in to view your profile' })
    }

    pool.query('SELECT answers.answer_body, answers.post_date, users.username, answers.answer_id, answers.edit_date, answers.wasEdited, answers.answerer_id, answers.isArchived FROM answers JOIN users ON users.user_id = answers.answerer_id JOIN posts ON answers.post_id = posts.post_id AND posts.post_id = ?', [ID], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const answerIDs = result.map(res => res.answer_id);
            const answerID = result[0].answer_id;

            pool.query('SELECT SUM (rating) AS rating, answer_id FROM answer_likes WHERE answer_id IN (?) GROUP BY answer_id', [answerIDs], (err, result2) => {
                if (err) throw err;
                if (decoded) {
                    const USER_ID = decoded.user.user_id;
                    const posts = result.map(post => {
                        const rating = result2.find(res => res.answer_id === post.answer_id);
                        const time = post.post_date.toLocaleString();
                        const editTime = post.edit_date.toLocaleString();
                        const like_amount = rating ? rating.rating : 0;
                        return { ...post, rating: like_amount, id: answerID, post_date: time, edit_date: editTime, isEditable: false }
                    })
                    posts.map(answer => {
                        const matchedAnswer = answer.answerer_id === USER_ID;
                        return { ...answer, isEditable: matchedAnswer ? answer.isEditable = true : answer.isEditable = false }
                    })
                    res.status(200).send(posts)
                } else {
                    const posts = result.map(post => {
                        const rating = result2.find(res => res.answer_id === post.answer_id);
                        const time = post.post_date.toLocaleString();
                        const like_amount = rating ? rating.rating : 0;
                        return { ...post, rating: like_amount, post_date: time}
                    })
                        res.status(200).send(posts)
                    }
            })
        }
    })
}



exports.editAnswer = async (req, res) => {
    let token, decoded;

    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.log(err)
        return res.status(401).send({ error: 'You must be logged in to edit your answer' })
    }

    const USER_ID = decoded.user.user_id;
    const { body } = req.body.body;
    const editDate = new Date();
    const POST_ID = req.body.id;
    const ANSWER_ID = req.body.answer_id;

    pool.query('SELECT answer_id FROM answers WHERE post_id = ?', [POST_ID], (err, result) => {

        pool.query('UPDATE answers SET answer_body = ?, edit_date = ?, wasEdited = ? WHERE answer_id = ? AND answerer_id = ?', [body, editDate, true, ANSWER_ID, USER_ID], (err, result2) => {
            if (err) throw err;
            res.status(200).send({ id: ANSWER_ID });
        })
    })
}

exports.adminDeletePost = async (req, res) => {
    const POST_ID = req.params.id;

    pool.query('UPDATE posts SET isDeletedByAdmin = ? WHERE post_id = ?', [true, POST_ID], (err, result) => {
        if (err) throw err;
        res.status(200).send(result)
    })
}

exports.answerRating = async (req, res) => {
    const rating = Math.min(Math.max(req.body.rating, -1), 1);
    let token, decoded;

    try {
        token = req.headers.authorization.split(' ')[1];
        decoded = token && jwt.verify(token, process.env.JWT_SECRET);
        if (decoded) {
            const user_id = decoded.user.user_id;
            const ANSWER_ID = req.body.id;

            pool.query('UPDATE answer_likes SET rating = ? WHERE answer_id = ? AND user_id = ?', [rating, ANSWER_ID, user_id], (err, result) => {
                if (err) throw err;
                if (result.affectedRows < 1) {
                    pool.query('INSERT INTO answer_likes SET rating = ?, answer_id = ?, user_id = ?', [rating, ANSWER_ID, user_id], (err, result) => {
                        if (err) throw err;
                    })
                }
            })
            pool.query('SELECT SUM (rating) AS rating FROM answer_likes WHERE answer_id = ?', [ANSWER_ID], (err, result) => {
                if (err) throw err;
                res.send(result[0].rating);
            })
        } else {
            res.status(401).send({ error: 'You must be logged in to rate' })
        }
    } catch (err) {
        console.log(err)
    }
}

exports.deleteQuestion = async (req, res) => {
    const POST_ID = req.params.id;
    pool.query('UPDATE posts SET isArchived = ? WHERE post_id = ?', [true, POST_ID], (err, result) => {
        if (err) throw err;
        res.status(200).send(result);
    })
}

exports.deleteAnswer = async (req, res) => {
    const ANSWER_ID = req.body.id;

    pool.query('UPDATE answers SET isArchived = ? WHERE answer_id = ?', [true, ANSWER_ID], (err, result) => {
        if (err) throw err;
        res.status(200).send(result);
    })
}