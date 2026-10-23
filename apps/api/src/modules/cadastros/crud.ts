import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const idParam = z.object({ id: z.coerce.number().int().positive() });

/** Operações mínimas de um delegate do Prisma usadas pelo CRUD genérico. */
type Delegate = {
  findMany(args: object): Promise<unknown[]>;
  create(args: { data: never; include?: object }): Promise<unknown>;
  update(args: { where: { id: number }; data: never; include?: object }): Promise<unknown>;
  delete(args: { where: { id: number } }): Promise<unknown>;
};

export type CrudConfig<S extends z.ZodType> = {
  caminho: string;
  delegate: unknown;
  schema: S;
  include?: object;
  orderBy?: object;
  /** Converte o corpo validado nos dados de criação/edição do Prisma. */
  paraCriar?: (d: z.output<S>) => object;
  paraAtualizar?: (d: z.output<S>, id: number) => object;
  /** Formata cada item na resposta. */
  paraDTO?: (item: never) => unknown;
};

/**
 * Registra GET/POST/PUT/DELETE para um cadastro auxiliar.
 * Exclusão de registro em uso cai no onDelete: Restrict e vira 409 em erros.ts.
 */
export function registrarCrud<S extends z.ZodType>(app: FastifyInstance, cfg: CrudConfig<S>) {
  const d = cfg.delegate as Delegate;
  const dto = (x: unknown) => (cfg.paraDTO ? cfg.paraDTO(x as never) : x);
  const criar = cfg.paraCriar ?? ((x: object) => x);
  const atualizar = cfg.paraAtualizar ?? ((x: object) => x);

  app.get(cfg.caminho, async () => {
    const itens = await d.findMany({
      include: cfg.include,
      orderBy: cfg.orderBy ?? { nome: 'asc' },
    });
    return itens.map(dto);
  });

  app.post(cfg.caminho, async (req, reply) => {
    const dados = cfg.schema.parse(req.body);
    const item = await d.create({ data: criar(dados as never) as never, include: cfg.include });
    return reply.status(201).send(dto(item));
  });

  app.put(`${cfg.caminho}/:id`, async (req) => {
    const { id } = idParam.parse(req.params);
    const dados = cfg.schema.parse(req.body);
    const item = await d.update({
      where: { id },
      data: atualizar(dados as never, id) as never,
      include: cfg.include,
    });
    return dto(item);
  });

  app.delete(`${cfg.caminho}/:id`, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    await d.delete({ where: { id } });
    return reply.status(204).send();
  });
}
