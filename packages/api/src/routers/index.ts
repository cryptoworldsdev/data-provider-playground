import { publicProcedure } from "../index";
import { templateRouter } from "../runtime";
import type { RouterClient } from "@orpc/server";

export const appRouter = publicProcedure.router({
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	template: {
		getById: templateRouter.getById,
		search: templateRouter.search,
		ping: templateRouter.ping,
		listenBackground: templateRouter.listenBackground,
		enqueueBackground: templateRouter.enqueueBackground,
	},
});

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
