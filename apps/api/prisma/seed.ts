/**
 * Dados FICTÍCIOS para desenvolvimento e demonstração.
 * ATENÇÃO: apaga todos os dados antes de popular. Não rode em produção com dados reais.
 * As datas são relativas a hoje, para sempre caírem no período da agenda pública.
 */
import { PrismaClient, type StatusSolicitacao } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

// O seed APAGA todos os dados. Em produção só roda se pedido explicitamente.
if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCAR !== 'sim') {
  console.error(
    'Seed bloqueado em produção: ele apaga todos os dados. Para rodar mesmo assim, defina SEED_FORCAR=sim.',
  );
  process.exit(1);
}

const db = new PrismaClient();

const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dia = (offset: number) => {
  const d = new Date(`${hoje}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const em = (data: string, hora: string) => new Date(`${data}T${hora}:00.000Z`);

async function main() {
  await db.$executeRawUnsafe(
    'TRUNCATE historico_status, solicitacao_recurso, solicitacao, ambiente_recurso, recurso, ambiente, curso, centro_custo, tema, usuario, configuracao RESTART IDENTITY CASCADE',
  );

  const hash = (s: string) => bcrypt.hash(s, 10);
  const admin = await db.usuario.create({
    data: {
      nome: 'Setor de Eventos (Admin)',
      matricula: '2026000001',
      email: 'admin@univille.test',
      senhaHash: await hash('admin123'),
      perfil: 'ADMIN',
    },
  });
  const ana = await db.usuario.create({
    data: {
      nome: 'Ana Medeiros Felix',
      matricula: '2026000002',
      email: 'ana.souza@univille.test',
      senhaHash: await hash('senha123'),
      perfil: 'SOLICITANTE',
    },
  });
  const carlos = await db.usuario.create({
    data: {
      nome: 'Carlos Prado Lima',
      matricula: '2026000003',
      email: 'carlos.lima@univille.test',
      senhaHash: await hash('senha123'),
      perfil: 'SOLICITANTE',
    },
  });
  await db.usuario.create({
    data: {
      nome: 'Bruno Tschoeke Dias',
      matricula: '2026000004',
      email: 'bruno@univille.test',
      senhaHash: await hash('senha123'),
      perfil: 'SOLICITANTE',
      ativo: false,
    },
  });

  const temas = Object.fromEntries(
    await Promise.all(
      ['Palestra', 'Congresso', 'Oficina', 'Workshop', 'Solenidade', 'Feira'].map(async (nome) => [
        nome,
        (await db.tema.create({ data: { nome } })).id,
      ]),
    ),
  ) as Record<string, number>;

  const recursos = Object.fromEntries(
    await Promise.all(
      ['Projetor', 'Som', 'Microfone', 'Palco', 'Notebook', 'Mesas', 'Transmissão ao vivo'].map(
        async (nome) => [nome, (await db.recurso.create({ data: { nome } })).id],
      ),
    ),
  ) as Record<string, number>;

  const ambientesDef: [string, number, string[]][] = [
    ['Auditório A', 300, ['Projetor', 'Som', 'Microfone', 'Palco', 'Transmissão ao vivo']],
    ['Miniauditório', 120, ['Projetor', 'Som', 'Microfone']],
    ['Lab. 105', 40, ['Projetor', 'Notebook', 'Microfone']],
    ['Sala 213', 50, ['Projetor']],
    ['Hall de Entrada', 400, ['Som', 'Mesas']],
  ];
  const ambientes: Record<string, number> = {};
  for (const [nome, capacidade, rs] of ambientesDef) {
    const a = await db.ambiente.create({
      data: { nome, capacidade, recursos: { create: rs.map((r) => ({ recursoId: recursos[r] })) } },
    });
    ambientes[nome] = a.id;
  }

  const cursosDef: [string, string, string][] = [
    ['Engenharia de Software', 'CC-4102', 'Engenharia de Software'],
    ['Sistemas de Informação', 'CC-5150', 'Sistemas de Informação'],
    ['Design', 'CC-3301', 'Design'],
    ['Administração', 'CC-1180', 'Administração'],
    ['Direito', 'CC-2207', 'Direito'],
    ['Pró-Reitoria de Extensão', 'CC-0900', 'Extensão e Assuntos Comunitários'],
  ];
  const cursos: Record<string, number> = {};
  for (const [nome, codigo, descricao] of cursosDef) {
    const cc = await db.centroCusto.create({ data: { codigo, descricao } });
    cursos[nome] = (await db.curso.create({ data: { nome, centroCustoId: cc.id } })).id;
  }

  await db.configuracao.create({ data: { chave: 'meses_agenda_publica', valor: '3' } });

  type Def = {
    nome: string;
    status: StatusSolicitacao;
    autor: number;
    tema?: string;
    dia?: number;
    ini?: string;
    fim?: string;
    local?: string;
    curso?: string;
    palestrante?: string;
    recursos?: string[];
    motivo?: string;
    incompleto?: boolean;
  };
  const defs: Def[] = [
    {
      nome: 'Semana Acadêmica de Engenharia',
      status: 'APROVADO',
      autor: ana.id,
      tema: 'Congresso',
      dia: 6,
      ini: '19:00',
      fim: '22:00',
      local: 'Auditório A',
      curso: 'Engenharia de Software',
      palestrante: 'Dra. Helena do Prado',
      recursos: ['Projetor', 'Som', 'Microfone'],
    },
    {
      nome: 'IA na Indústria Moveleira',
      status: 'APROVADO',
      autor: carlos.id,
      tema: 'Palestra',
      dia: 8,
      ini: '14:00',
      fim: '16:00',
      local: 'Miniauditório',
      curso: 'Design',
      palestrante: 'Rafael Dias',
      recursos: ['Projetor'],
    },
    {
      nome: 'Oficina de Currículo',
      status: 'APROVADO',
      autor: carlos.id,
      tema: 'Oficina',
      dia: 6,
      ini: '14:00',
      fim: '16:00',
      local: 'Lab. 105',
      curso: 'Administração',
      palestrante: 'Núcleo de Carreiras',
    },
    {
      nome: 'Workshop de Git e GitHub',
      status: 'APROVADO',
      autor: ana.id,
      tema: 'Workshop',
      dia: 15,
      ini: '18:30',
      fim: '20:00',
      local: 'Lab. 105',
      curso: 'Sistemas de Informação',
      palestrante: 'Marina Tschoeke',
      recursos: ['Projetor', 'Notebook'],
    },
    {
      nome: 'Carreira em Dados',
      status: 'APROVADO',
      autor: carlos.id,
      tema: 'Palestra',
      dia: 21,
      ini: '10:00',
      fim: '11:30',
      local: 'Sala 213',
      curso: 'Sistemas de Informação',
      palestrante: 'Júlia Medeiros',
    },
    {
      nome: 'Feira de Profissões',
      status: 'APROVADO',
      autor: ana.id,
      tema: 'Feira',
      dia: 34,
      ini: '09:00',
      fim: '17:00',
      local: 'Hall de Entrada',
      curso: 'Pró-Reitoria de Extensão',
      palestrante: 'Coordenações dos cursos',
      recursos: ['Som', 'Mesas'],
    },
    {
      nome: 'Colação de Grau Simulada',
      status: 'APROVADO',
      autor: carlos.id,
      tema: 'Solenidade',
      dia: 48,
      ini: '19:30',
      fim: '21:30',
      local: 'Auditório A',
      curso: 'Direito',
      palestrante: 'Reitoria',
      recursos: ['Som', 'Microfone', 'Palco'],
    },
    // Dois pendentes que se sobrepõem entre si: aprovar um faz o outro falhar na aprovação.
    {
      nome: 'Feira de Estágios',
      status: 'AGUARDANDO',
      autor: ana.id,
      tema: 'Feira',
      dia: 27,
      ini: '18:00',
      fim: '21:00',
      local: 'Hall de Entrada',
      curso: 'Administração',
      palestrante: 'Empresas parceiras',
      recursos: ['Mesas'],
    },
    {
      nome: 'Mostra de Projetos Integradores',
      status: 'AGUARDANDO',
      autor: carlos.id,
      tema: 'Feira',
      dia: 27,
      ini: '19:00',
      fim: '22:00',
      local: 'Hall de Entrada',
      curso: 'Engenharia de Software',
      palestrante: 'Turmas do 3º ano',
    },
    {
      nome: 'Hackathon Interno',
      status: 'REJEITADO',
      autor: ana.id,
      tema: 'Oficina',
      dia: 20,
      ini: '19:00',
      fim: '22:00',
      local: 'Lab. 105',
      curso: 'Engenharia de Software',
      palestrante: 'Prof. Ana Medeiros Felix',
      motivo:
        'O Lab. 105 está reservado para manutenção até as 20h nesse dia. Ajuste o horário para começar às 20h ou escolha outro local.',
    },
    {
      nome: 'Mostra de Robótica',
      status: 'CANCELADO',
      autor: carlos.id,
      tema: 'Feira',
      dia: 12,
      ini: '14:00',
      fim: '17:00',
      local: 'Hall de Entrada',
      curso: 'Engenharia de Software',
      palestrante: 'Equipe de Robótica',
    },
    {
      nome: 'Palestra sobre LGPD',
      status: 'RASCUNHO',
      autor: ana.id,
      tema: 'Palestra',
      curso: 'Direito',
      incompleto: true,
    },
  ];

  for (const d of defs) {
    const data = d.dia !== undefined ? dia(d.dia) : null;
    const s = await db.solicitacao.create({
      data: {
        status: d.status,
        autorId: d.autor,
        nome: d.nome,
        temaId: d.tema ? temas[d.tema] : null,
        data: data ? em(data, '00:00') : null,
        inicio: data && d.ini ? em(data, d.ini) : null,
        fim: data && d.fim ? em(data, d.fim) : null,
        ambienteId: d.local ? ambientes[d.local] : null,
        cursoId: d.curso ? cursos[d.curso] : null,
        solicitanteNome: d.incompleto
          ? null
          : d.autor === ana.id
            ? 'Prof. Ana Medeiros Felix'
            : 'Coord. Carlos Prado Lima',
        palestrante: d.palestrante ?? null,
        publicoAlvo: d.incompleto ? null : 'Alunos de graduação e comunidade acadêmica',
        justificativa: d.incompleto
          ? null
          : 'Integrar teoria e prática com a comunidade acadêmica.',
        objetivo: d.incompleto ? null : 'Aproximar os estudantes do mercado e de temas atuais.',
        cerimonial: d.incompleto ? null : d.tema === 'Solenidade',
        haveraInscricoes: d.incompleto ? null : d.tema !== 'Palestra',
        necessitaDeclaracoes: d.incompleto ? null : d.tema === 'Oficina' || d.tema === 'Workshop',
        motivoRejeicao: d.motivo ?? null,
        enviadoEm: d.status === 'RASCUNHO' ? null : new Date(),
        recursos: { create: (d.recursos ?? []).map((r) => ({ recursoId: recursos[r] })) },
      },
    });
    const passos: StatusSolicitacao[] =
      d.status === 'RASCUNHO'
        ? ['RASCUNHO']
        : ['RASCUNHO', 'AGUARDANDO', ...(d.status === 'AGUARDANDO' ? [] : [d.status])];
    for (let i = 0; i < passos.length; i++) {
      const finalizaAdmin = i === 2;
      await db.historicoStatus.create({
        data: {
          solicitacaoId: s.id,
          de: i === 0 ? null : passos[i - 1],
          para: passos[i],
          usuarioId: finalizaAdmin ? admin.id : d.autor,
          motivo: finalizaAdmin && d.status === 'REJEITADO' ? d.motivo : null,
        },
      });
    }
  }

  console.log('Seed concluído. Usuários de teste (fictícios), login por matrícula:');
  console.log('  2026000001 / admin123  Setor de Eventos (Administrador)');
  console.log('  2026000002 / senha123  Ana Medeiros Felix (Solicitante)');
  console.log('  2026000003 / senha123  Carlos Prado Lima (Solicitante)');
  console.log('  2026000004 / senha123  Bruno Tschoeke Dias (desativado)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
