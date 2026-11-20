
console.log('Iniciando teste do Firestore...');

const { db } = require('../config/firebase');

async function testarFirestore() {
    try {
        const teste = db.collection('_testes_conexao').doc('teste');

        await teste.set({
            mensagem: 'Conexão funcionando!',
            data: new Date()
        });

        console.log('Firestore conectado!');

        const documento = await teste.get();
        console.log('Dados:', documento.data());

        await teste.delete();

        console.log('Teste concluído e documento removido!');
    } catch (erro) {
        console.error('Erro ao conectar:', erro);
    }
}

testarFirestore();