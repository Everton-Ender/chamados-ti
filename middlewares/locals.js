
const constants = require('../config/constants');
const helpers = require('../utils/helpers');

// Disponibilizar dados globais nas views
module.exports = (req, res, next) => {
    Object.assign(res.locals, constants, helpers);

    res.locals.msg = req.query.msg || null;
    res.locals.erro = req.query.erro || null;
    res.locals.currentPath = req.path;
    res.locals.title = 'HelpDesk TI';

    // Disponibilizar usuário autenticado nas páginas
    res.locals.user = req.user || null;

    next();
};