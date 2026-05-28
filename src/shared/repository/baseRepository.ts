import { Prisma } from "@prisma/client";

type PrismaDelegate<T> = {
  findUnique(args: {
    where: Prisma.Args<T, "findUnique">["where"];
  }): Promise<any>;
  findFirst(args: {
    where?: Prisma.Args<T, "findFirst">["where"];
    include?: Prisma.Args<T, "findFirst">["include"];
  }): Promise<any>;
  findMany(args?: Prisma.Args<T, "findMany">): Promise<any[]>;
  create(args: { data: Prisma.Args<T, "create">["data"] }): Promise<any>;
  update(args: {
    where: Prisma.Args<T, "update">["where"];
    data: Prisma.Args<T, "update">["data"];
  }): Promise<any>;
  delete(args: { where: Prisma.Args<T, "delete">["where"] }): Promise<any>;
  count(args?: {
    where?: Prisma.Args<T, "findMany">["where"];
  }): Promise<number>;
  deleteMany(args: {
    where: Prisma.Args<T, "deleteMany">["where"];
  }): Promise<any>;
  createMany(args: {
    data: Prisma.Args<T, "createMany">["data"];
    skipDuplicates?: Prisma.Args<T, "createMany">["skipDuplicates"];
  }): Promise<any>;
  updateMany(args: {
    where?: Prisma.Args<T, "createMany">["where"];
    data: Prisma.Args<T, "updateMany">["data"];
  }): Promise<Prisma.BatchPayload>;
  upsert(args: {
    where: Prisma.Args<T, "upsert">["where"];
    create: Prisma.Args<T, "upsert">["data"];
    update: Prisma.Args<T, "upsert">["update"];
  }): Promise<Prisma.Result<T, typeof args, "upsert">>;
};

export abstract class BaseRepository<TDelegate, TResult> {
  constructor(protected readonly model: PrismaDelegate<TDelegate>) {}

  async findById(id: string): Promise<TResult | null> {
    return this.model.findUnique({
      where: { id } as Prisma.Args<TDelegate, "findUnique">["where"],
    });
  }

  async findOne(
    where: Prisma.Args<TDelegate, "findFirst">["where"],
    include?: Prisma.Args<TDelegate, "findFirst">["include"],
  ): Promise<TResult | null> {
    return this.model.findFirst({
      where,
      include,
    });
  }

  async findMany(params?: {
    where?: Prisma.Args<TDelegate, "findMany">["where"];
    orderBy?: Prisma.Args<TDelegate, "findMany">["orderBy"];
    page?: number;
    limit?: number;
    include?: Prisma.Args<TDelegate, "findMany">["include"];
  }): Promise<{
    data: TResult[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 15, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: params?.where,
        orderBy: params?.orderBy,
        skip,
        take: limit,
        include: params?.include,
      } as Prisma.Args<TDelegate, "findMany">),
      this.model.count({
        where: params?.where,
      }),
    ]);

    return {
      data: data as TResult[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(
    data: Prisma.Args<TDelegate, "create">["data"],
  ): Promise<TResult> {
    return this.model.create({ data });
  }

  async update(
    where: Prisma.Args<TDelegate, "update">["where"],
    data: Prisma.Args<TDelegate, "update">["data"],
  ): Promise<TResult> {
    return this.model.update({
      where,
      data,
    });
  }

  async delete(
    where: Prisma.Args<TDelegate, "delete">["where"],
  ): Promise<TResult> {
    return this.model.delete({ where });
  }

  async count(
    where?: Prisma.Args<TDelegate, "findMany">["where"],
  ): Promise<number> {
    return this.model.count({ where });
  }

  async exists(
    where: Prisma.Args<TDelegate, "findFirst">["where"],
  ): Promise<boolean> {
    const result = await this.model.findFirst({
      where,
    });

    return result !== null;
  }

  async deleteMany(
    where: Prisma.Args<TDelegate, "deleteMany">["where"],
  ): Promise<{ count: number }> {
    return this.model.deleteMany({ where });
  }

  async createMany({
    data,
    skipDuplicates,
  }: {
    data: Prisma.Args<TDelegate, "createMany">["data"];
    skipDuplicates?: Prisma.Args<TDelegate, "createMany">["skipDuplicates"];
  }): Promise<{ count: number }> {
    return this.model.createMany({ data, skipDuplicates });
  }

  async updateMany(args: {
    where?: Prisma.Args<TDelegate, "updateMany">["where"];
    data: Prisma.Args<TDelegate, "updateMany">["data"];
  }): Promise<Prisma.BatchPayload> {
    return await this.model.updateMany({ where: args.where, data: args.data });
  }

  async upsert(args: {
    where: Prisma.Args<TDelegate, "upsert">["where"];
    create: Prisma.Args<TDelegate, "upsert">["data"];
    update: Prisma.Args<TDelegate, "upsert">["update"];
  }): Promise<Prisma.Result<TDelegate, typeof args, "upsert">> {
    return await this.model.upsert({
      where: args.where,
      create: args.create,
      update: args.update,
    });
  }
}
