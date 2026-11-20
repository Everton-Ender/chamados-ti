
const { db } = require('../config/firebase');

// Gera IDs numéricos sequenciais sem duplicação
async function proximoId(nome) {
    const contadorRef = db.collection('counters').doc(nome);

    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(contadorRef);

        const ultimoId = snapshot.exists
            ? Number(snapshot.data().lastId || 0)
            : 0;

        const novoId = ultimoId + 1;

        transaction.set(contadorRef, {
            lastId: novoId
        });

        return novoId;
    });
}

module.exports = {
    proximoId
};
