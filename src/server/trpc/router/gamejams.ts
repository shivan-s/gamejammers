import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { formatISO } from "date-fns";
import NewGameJamSchema from "../../../schema/gamejam";

export const gameJamRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(1000).optional(),
        cursor: z.string().optional(),
        q: z.string().optional(),
        timeFrame: z.union([
          z.literal("all"),
          z.literal("current"),
          z.literal("previous"),
          z.literal("upcoming"),
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, q, timeFrame } = input;
      const limit = input.limit ?? 50;

      const now = formatISO(Date.now());

      let timeFilter = {};

      switch (timeFrame) {
        case "current":
          timeFilter = {
            AND: [
              {
                startDate: {
                  lte: now,
                },
                endDate: {
                  gte: now,
                },
              },
            ],
          };
          break;
        case "previous":
          timeFilter = {
            AND: [
              {
                startDate: {
                  lte: now,
                },
                endDate: {
                  lte: now,
                },
              },
            ],
          };
          break;
        case "upcoming":
          timeFilter = {
            AND: [
              {
                startDate: {
                  gte: now,
                },
                endDate: {
                  gte: now,
                },
              },
            ],
          };
          break;
      }

      const filter = {
        name: {
          contains: q,
        },
        ...timeFilter,
      };
      const gameJams = await ctx.prisma.gameJam.findMany({
        where: filter,
        include: {
          teams: true,
          hosts: true,
          hostUsers: true,
        },
        orderBy: [{ startDate: "desc" }, { id: "asc" }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      });

      const gamejamsCount = await ctx.prisma.gameJam.count({
        where: filter,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (gameJams.length > limit) {
        const nextGameJam = gameJams.pop();
        nextCursor = nextGameJam ? nextGameJam.id : undefined;
      }
      return { gameJams: gameJams, nextCursor, count: gamejamsCount };
    }),

  getById: publicProcedure
    .input(z.string().optional())
    .query(async ({ ctx, input }) => {
      const gameJam = await ctx.prisma.gameJam.findUnique({
        where: { id: input },
        include: {
          hosts: true,
          hostUsers: true,
          teams: { include: { teamToUser: { include: { user: true } } } },
        },
      });
      return gameJam;
    }),

  createOrUpdate: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        id: z.string().optional(),
        ...NewGameJamSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, startDate, endDate, name, description } = input;
      const id = input.id || "";
      // maybe split this into update and create for validation of the user
      // check if this user is present in the
      const gameJam = await ctx.prisma.gameJam.upsert({
        where: {
          id: id,
        },
        create: {
          startDate: startDate,
          endDate: endDate,
          name: name,
          description: description || "",
          hostUsers: {
            connect: {
              id: userId,
            },
          },
        },
        update: {
          startDate: startDate,
          endDate: endDate,
          name: name,
          description: description || "",
          hostUsers: {
            connect: {
              id: userId,
            },
          },
        },
      });
      return gameJam;
    }),

  /* delete: protectedProcedure */
  /*   .input(z.object({ userId: z.string(), id: z.string() })) */
  /*   .mutation(async ({ ctx, input }) => { */
  /*     const { userId, id } = input; */
  /*     const gameJam = await ctx.prisma.gameJam.delete({ where: { id: id } }); */
  /*   }), */
});
