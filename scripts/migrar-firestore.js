
const {
    sequelize,
    Ticket,
    Technician,
    Category,
    Comment
} = require('../models');

const { db } = require('../config/firebase');

const LIMITE_BATCH = 450;

// Calcula as iniciais de um técnico
function gerarIniciais(nome) {
    return (nome || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(parte => parte[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// Grava documentos em lotes seguros
async function gravarDocumentos(documentos) {
    let batch = db.batch();
    let quantidade = 0;
    let total = 0;

    for (const documento of documentos) {
        batch.set(documento.ref, documento.dados);
        quantidade++;
        total++;

        if (quantidade >= LIMITE_BATCH) {
            await batch.commit();
            batch = db.batch();
            quantidade = 0;
        }
    }

    if (quantidade > 0) {
        await batch.commit();
    }

    return total;
}

// Impede sobrescrever dados que já estejam no Firestore
async function verificarDestinoVazio() {
    const colecoes = ['tickets', 'categories', 'technicians'];

    for (const nome of colecoes) {
        const resultado = await db.collection(nome).limit(1).get();

        if (!resultado.empty) {
            throw new Error(
                `A coleção "${nome}" já possui dados. Migração cancelada para evitar sobrescrita.`
            );
        }
    }
}

async function migrar() {
    try {
        console.log('\nIniciando migração para o Firestore...\n');

        await sequelize.authenticate();
        console.log('✔ Conexão com SQLite confirmada.');

        await verificarDestinoVazio();
        console.log('✔ Coleções de destino estão vazias.');

        // Buscar dados originais
        const [categorias, tecnicos, chamados, comentarios] =
            await Promise.all([
                Category.findAll({ order: [['id', 'ASC']] }),
                Technician.findAll({ order: [['id', 'ASC']] }),
                Ticket.findAll({ order: [['id', 'ASC']] }),
                Comment.findAll({ order: [['id', 'ASC']] })
            ]);

        console.log(`Categorias encontradas: ${categorias.length}`);
        console.log(`Técnicos encontrados: ${tecnicos.length}`);
        console.log(`Chamados encontrados: ${chamados.length}`);
        console.log(`Comentários encontrados: ${comentarios.length}`);

        // Categorias
        const docsCategorias = categorias.map(c => ({
            ref: db.collection('categories').doc(String(c.id)),
            dados: {
                id: c.id,
                nome: c.nome,
                descricao: c.descricao,
                cor: c.cor,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            }
        }));

        await gravarDocumentos(docsCategorias);
        console.log('✔ Categorias migradas.');

        // Técnicos
        const docsTecnicos = tecnicos.map(t => ({
            ref: db.collection('technicians').doc(String(t.id)),
            dados: {
                id: t.id,
                nome: t.nome,
                email: t.email,
                especialidade: t.especialidade,
                ativo: t.ativo,
                iniciais: gerarIniciais(t.nome),
                createdAt: t.createdAt,
                updatedAt: t.updatedAt
            }
        }));

        await gravarDocumentos(docsTecnicos);
        console.log('✔ Técnicos migrados.');

        // Chamados
        const docsChamados = chamados.map(t => ({
            ref: db.collection('tickets').doc(String(t.id)),
            dados: {
                id: t.id,
                protocolo: t.protocolo,
                titulo: t.titulo,
                descricao: t.descricao,
                solicitante: t.solicitante,
                emailSolicitante: t.emailSolicitante,
                setor: t.setor,
                prioridade: t.prioridade,
                status: t.status,
                categoryId: t.categoryId,
                technicianId: t.technicianId,
                resolvidoEm: t.resolvidoEm,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt
            }
        }));

        await gravarDocumentos(docsChamados);
        console.log('✔ Chamados migrados.');

        // Comentários dentro de cada chamado
        const docsComentarios = comentarios.map(c => ({
            ref: db.collection('tickets')
                .doc(String(c.ticketId))
                .collection('comentarios')
                .doc(String(c.id)),
            dados: {
                id: c.id,
                ticketId: c.ticketId,
                autor: c.autor,
                mensagem: c.mensagem,
                tipo: c.tipo,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            }
        }));

        await gravarDocumentos(docsComentarios);
        console.log('✔ Comentários migrados.');

        // Preservar a sequência dos protocolos
        const maiorId = chamados.reduce(
            (maior, t) => Math.max(maior, Number(t.id)),
            0
        );

        await db.collection('counters').doc('tickets').set({
            lastId: maiorId
        });

        console.log('\n================================');
        console.log('MIGRAÇÃO CONCLUÍDA!');
        console.log('================================');
        console.log(`Categorias: ${categorias.length}`);
        console.log(`Técnicos: ${tecnicos.length}`);
        console.log(`Chamados: ${chamados.length}`);
        console.log(`Comentários: ${comentarios.length}`);
        console.log(`Último protocolo: CH-${String(maiorId).padStart(5, '0')}`);
        console.log('================================\n');

    } catch (erro) {
        console.error('\nERRO NA MIGRAÇÃO:', erro.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

migrar();
