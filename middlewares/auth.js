
const { auth, db } = require('../config/firebase');

// Verificar sessão do usuário
async function verificarAutenticacao(req, res, next) {
    try {
        const sessionCookie = req.cookies.session || '';

        if (!sessionCookie) {
            return res.redirect('/login');
        }

        const decodedClaims = await auth.verifySessionCookie(
            sessionCookie,
            true
        );

        const userDoc = await db.collection('users')
            .doc(decodedClaims.uid)
            .get();

        if (!userDoc.exists) {
            res.clearCookie('session');
            return res.redirect('/login');
        }

        req.user = {
            ...userDoc.data(),
            uid: decodedClaims.uid
        };

        res.locals.user = req.user;

        next();

    } catch (erro) {
        console.error('Erro ao verificar sessão:', erro.message);

        res.clearCookie('session');
        return res.redirect('/login');
    }
}

// Verificar nível de acesso
function permitirRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).render('error', {
                title: 'Acesso negado',
                statusCode: 403,
                error: {
                    status: 403,
                    statusCode: 403,
                    message: 'Você não tem permissão para acessar esta página.'
                }
            });
        }

        next();
    };
}

module.exports = {
    verificarAutenticacao,
    permitirRoles
};
