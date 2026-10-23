import { Link, Outlet } from 'react-router';
import { ProfileMenu } from '../components/ProfileMenu';

export function Marca() {
  return (
    <Link
      to="/"
      aria-label="Univille Eventos: agenda"
      className="flex items-center gap-2.5 text-white no-underline"
    >
      <img
        src="/logo-univille.png"
        alt="Univille"
        width={125}
        height={28}
        className="block h-7 w-auto"
      />
      <span className="border-l border-white/45 pl-2.5 text-[13px] leading-none opacity-85">
        eventos
      </span>
    </Link>
  );
}

export function Rodape() {
  return (
    <footer className="px-4 pt-8 pb-10 text-center text-[13px] text-[#555]">
      <p>Univille Eventos 0.1 · Software Engineering Challenge 2026</p>
    </footer>
  );
}

type Unidade = {
  nome: string;
  email: string;
  telefones: { numero: string; rotulo?: string }[];
  endereco: string;
  cidade: string;
  cep: string;
  razaoSocial?: string;
  cnpj: string;
};

/** Unidades da Univille, como no rodapé do site oficial. */
const UNIDADES: Unidade[] = [
  {
    nome: 'Campus Joinville',
    email: 'univille@univille.br',
    telefones: [{ numero: '(47) 3461-9000' }],
    endereco: 'Rua Paulo Malschitzki, 10 - Zona Industrial Norte',
    cidade: 'Joinville - SC',
    cep: '89219-710',
    razaoSocial: 'Fundação Educacional da Região de Joinville',
    cnpj: '84.714.682/0001-94',
  },
  {
    nome: 'Unidade Centro - Joinville',
    email: 'unidadecentro@univille.br',
    telefones: [{ numero: '(47) 3431-0600' }],
    endereco: 'Rua Rio do Sul, 270 - Bucarein',
    cidade: 'Joinville - SC',
    cep: '89202-201',
    cnpj: '84.714.682/0004-37',
  },
  {
    nome: 'Campus São Bento do Sul',
    email: 'univillesbs@univille.br',
    telefones: [{ numero: '(47) 3631-9120' }],
    endereco: 'R. Norberto Eduardo Weihermann, 230 - Colonial',
    cidade: 'São Bento do Sul - SC',
    cep: '89288-385',
    razaoSocial: 'Fundação Educacional da Região de Joinville',
    cnpj: '84.714.682/0002-75',
  },
  {
    nome: 'Unidade São Francisco do Sul',
    email: 'univille.sfs@univille.br',
    telefones: [
      { numero: '(47) 3471-3800', rotulo: 'Atendimento' },
      { numero: '(47) 3471-3802', rotulo: 'Colégio' },
    ],
    endereco: 'Rod. Duque de Caxias, Km 8, 6.365 - Iperoba',
    cidade: 'São Francisco do Sul - SC',
    cep: '89334-070',
    cnpj: '84.714.682/0003-56',
  },
];

const soDigitos = (t: string) => t.replace(/\D/g, '');

/** Rodapé institucional da área pública, no mesmo formato do site oficial da Univille. */
function RodapeInstitucional() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto grid max-w-[1160px] gap-x-8 gap-y-9 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {UNIDADES.map((u) => (
          <address key={u.nome} className="grid content-start text-[14px] leading-[1.6] not-italic">
            <h2 className="mb-4 text-[20px] leading-snug font-normal">{u.nome}</h2>
            <a href={`mailto:${u.email}`} className="w-max text-white hover:underline">
              {u.email}
            </a>
            {u.telefones.map((t) => (
              <a
                key={t.numero}
                href={`tel:+55${soDigitos(t.numero)}`}
                className="w-max text-white hover:underline"
              >
                {t.numero}
                {t.rotulo && ` - ${t.rotulo}`}
              </a>
            ))}
            <span className="mt-5">{u.endereco}</span>
            <span>{u.cidade}</span>
            <span>{u.cep}</span>
            {u.razaoSocial && <span>Razão Social: {u.razaoSocial}</span>}
            <span>CNPJ: {u.cnpj}</span>
          </address>
        ))}
      </div>
    </footer>
  );
}

/** Área pública: barra verde com a marca e o acesso (Entrar ou perfil). Sem gaveta. */
export function PublicLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex h-[58px] items-center gap-4 border-b-[3px] border-verde-claro bg-uni px-4 shadow-[0_1px_3px_rgba(0,0,0,.25)] sm:px-6">
        <Marca />
        <div className="ml-auto">
          <ProfileMenu mostrarMinhaArea />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <RodapeInstitucional />
    </div>
  );
}
