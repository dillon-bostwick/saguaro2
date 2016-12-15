module.exports = (req, res, next) => {
    delete req.user.currentToken;

    res.send(req.user);
};