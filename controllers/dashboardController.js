
const { listar, buscar } = require('../services/firestore');

const {
    STATUS,
    PRIORIDADES,
    STATUS_ATIVOS
} = require('../config/constants');

function gerarIniciais(nome) {
    const partes = (nome || '').trim().split(/\s+/);

    return (
        (partes[0]?.[0] || '') +
        (partes.length > 1 ? partes[partes.length - 1][0] : '')
    ).toUpperCase();
}

async function enriquecerTicket(ticket) {
    const [categoria, tecnico] = await Promise.all([
        ticket.categoryId
            ? buscar('categories', ticket.categoryId)
            : null,
        ticket.technicianId
            ? buscar('technicians', ticket.technicianId)
            : null
    ]);

    return {
        ...ticket,
        protocolo: ticket.protocolo ||
            `CH-${String(ticket.id).padStart(5, '0')}`,
        categoria,
        tecnico
    };
}

exports.index = async (req, res) => {
    const [chamados, tecnicosRaw, categoriasRaw] = await Promise.all([
        listar('tickets'),
        listar('technicians'),
        listar('categories')
    ]);

    // Contagem por status
    const porStatus = {};

    for (const status of Object.keys(STATUS)) {
        porStatus[status] = chamados.filter(
            t => t.status === status
        ).length;
    }

    const total = chamados.length;

    const ativos = chamados.filter(
        t => STATUS_ATIVOS.includes(t.status)
    ).length;

    // Chamados ativos por prioridade
    const porPrioridade = {};

    for (const prioridade of Object.keys(PRIORIDADES)) {
        porPrioridade[prioridade] = chamados.filter(
            t => t.prioridade === prioridade &&
                STATUS_ATIVOS.includes(t.status)
        ).length;
    }

    // Fila prioritária
    const prioritariosRaw = chamados
        .filter(t =>
            ['critica', 'alta'].includes(t.prioridade) &&
            STATUS_ATIVOS.includes(t.status)
        )
        .sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        )
        .slice(0, 5);

    // Chamados recentes
    const recentesRaw = [...chamados]
        .sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        )
        .slice(0, 6);

    const [prioritarios, recentes] = await Promise.all([
        Promise.all(prioritariosRaw.map(enriquecerTicket)),
        Promise.all(recentesRaw.map(enriquecerTicket))
    ]);

    // Chamados ativos sem técnico
    const semTecnico = chamados.filter(
        t => !t.technicianId &&
            STATUS_ATIVOS.includes(t.status)
    ).length;

    // Carga de trabalho por técnico
    const tecnicos = tecnicosRaw
        .filter(t => t.ativo)
        .map(t => {
            const ticketsDoTecnico = chamados.filter(
                x => x.technicianId === t.id
            );

            return {
                nome: t.nome,
                iniciais: t.iniciais || gerarIniciais(t.nome),
                ativos: ticketsDoTecnico.filter(
                    x => STATUS_ATIVOS.includes(x.status)
                ).length,
                resolvidos: ticketsDoTecnico.filter(
                    x => !STATUS_ATIVOS.includes(x.status)
                ).length
            };
        })
        .sort((a, b) => b.ativos - a.ativos);

    // Distribuição por categoria
    const categorias = categoriasRaw
        .map(c => ({
            nome: c.nome,
            cor: c.cor,
            total: chamados.filter(
                t => t.categoryId === c.id
            ).length
        }))
        .sort((a, b) => b.total - a.total);

    // Tempo médio de resolução em horas
    const resolvidos = chamados.filter(
        t => t.resolvidoEm
    );

    const tempoMedio = resolvidos.length
        ? resolvidos.reduce((acc, t) => {
            return acc + (
                new Date(t.resolvidoEm) -
                new Date(t.createdAt)
            );
        }, 0) / resolvidos.length / 36e5
        : null;

    res.render('dashboard', {
        title: 'Dashboard',
        total,
        ativos,
        porStatus,
        porPrioridade,
        prioritarios,
        recentes,
        semTecnico,
        tecnicos,
        categorias,
        tempoMedio
    });
};
