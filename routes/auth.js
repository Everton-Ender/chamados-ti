
const express = require('express');
const { FieldValue } = require('firebase-admin/firestore');
const { auth, db } = require('../config/firebase');

const router = express.Router();

const SESSION_DURATION = 5 * 24 * 60 * 60 * 1000;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
};

// Página de login
router.get('/login', (req, res) => {
    res.render('auth/login', {
        title: 'Login'
    });
});

// Página de cadastro
router.get('/register', (req, res) => {
    res.render('auth/register', {
        title: 'Criar conta'
    });
});

// Criar sessão após autenticação no Firebase
router.post('/session', async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                erro: 'Token de autenticação não informado.'
            });
        }

        // Validar token do Firebase
        const decodedToken = await auth.verifyIdToken(idToken);

        // Exigir autenticação recente (últimos 5 minutos)
        const tempoDesdeLogin =
            Math.floor(Date.now() / 1000) - decodedToken.auth_time;

        if (tempoDesdeLogin > 5 * 60 || tempoDesdeLogin < -60) {
            return res.status(401).json({
                erro: 'Sua autenticação expirou. Faça login novamente.'
            });
        }

        // Criar cookie de sessão
        const sessionCookie = await auth.createSessionCookie(idToken, {
            expiresIn: SESSION_DURATION
        });

        // Registrar usuário no Firestore
        const userRef = db.collection('users').doc(decodedToken.uid);

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const existingUser = userDoc.exists ? userDoc.data() : {};

            transaction.set(userRef, {
                uid: decodedToken.uid,
                email: decodedToken.email || null,
                displayName:
                    decodedToken.name ||
                    existingUser.displayName ||
                    null,
                photoURL:
                    decodedToken.picture ||
                    existingUser.photoURL ||
                    null,
                role: existingUser.role || 'user',
                createdAt:
                    existingUser.createdAt ||
                    FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
        });

        res.cookie('session', sessionCookie, {
            ...cookieOptions,
            maxAge: SESSION_DURATION
        });

        return res.json({
            sucesso: true,
            mensagem: 'Autenticação realizada!'
        });

    } catch (erro) {
        console.error('Erro completo na autenticação:', erro);

        return res.status(401).json({
            erro: 'Não foi possível autenticar. Tente novamente.'
        });
    }
});

// Encerrar sessão
router.post('/logout', (req, res) => {
    res.clearCookie('session', cookieOptions);

    return res.redirect('/login');
});

module.exports = router;
