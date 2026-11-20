
const path = require('path');
const express = require('express');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const authRoutes = require('./routes/auth');

const locals = require('./middlewares/locals');
const { verificarAutenticacao } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares gerais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Dados globais das views
app.use(locals);

// Rotas públicas de autenticação
app.use(authRoutes);

// Exigir autenticação nas demais rotas
app.use(verificarAutenticacao);

// Rotas protegidas
app.use(routes);

// 404
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Página não encontrada'
    });
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error(err);

    const status = err.status || err.statusCode || 500;

    res.status(status).render('error', {
        title: 'Erro',
        statusCode: status,
        error: err
    });
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`\n  HelpDesk TI rodando em http://localhost:${PORT}\n`);
});
