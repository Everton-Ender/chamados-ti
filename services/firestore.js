
const { db } = require('../config/firebase');

const collections = {
    tickets: db.collection('tickets'),
    categories: db.collection('categories'),
    technicians: db.collection('technicians')
};

// Converter documentos do Firestore em objetos simples
function converterDocumento(doc) {
    if (!doc.exists) return null;

    const dados = doc.data();

    return {
        ...dados,
        id: Number(dados.id ?? doc.id),
        createdAt: dados.createdAt?.toDate
            ? dados.createdAt.toDate()
            : dados.createdAt,
        updatedAt: dados.updatedAt?.toDate
            ? dados.updatedAt.toDate()
            : dados.updatedAt,
        resolvidoEm: dados.resolvidoEm?.toDate
            ? dados.resolvidoEm.toDate()
            : dados.resolvidoEm
    };
}

// Buscar todos os documentos de uma coleção
async function listar(colecao) {
    const snapshot = await collections[colecao]
        .orderBy('id', 'asc')
        .get();

    return snapshot.docs.map(converterDocumento);
}

// Buscar documento pelo ID
async function buscar(colecao, id) {
    const doc = await collections[colecao]
        .doc(String(id))
        .get();

    return converterDocumento(doc);
}

// Salvar documento
async function salvar(colecao, id, dados) {
    const referencia = id
        ? collections[colecao].doc(String(id))
        : collections[colecao].doc();

    await referencia.set({
        ...dados,
        id: id ? Number(id) : Number(referencia.id),
        updatedAt: new Date()
    }, { merge: true });

    return buscar(colecao, referencia.id);
}

// Excluir documento
async function excluir(colecao, id) {
    await collections[colecao]
        .doc(String(id))
        .delete();
}

module.exports = {
    collections,
    converterDocumento,
    listar,
    buscar,
    salvar,
    excluir
};
