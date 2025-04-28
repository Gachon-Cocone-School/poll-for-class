import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import * as groupService from "../../../lib/groupService";

// Define validation schemas using Zod
const createGroupSchema = z.object({
  group_name: z.string().min(1),
  group_description: z.string(),
});

const updateGroupSchema = z.object({
  id: z.string(),
  group_name: z.string().min(1).optional(),
  group_description: z.string().optional(),
});

const memberSchema = z.object({
  member_name: z.string().min(1),
  member_no: z.string(),
});

export const groupRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return await groupService.getGroups();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await groupService.getGroupById(input.id);
    }),

  create: publicProcedure
    .input(createGroupSchema)
    .mutation(async ({ input }) => {
      const id = await groupService.createGroup(input);
      return { id };
    }),

  update: publicProcedure
    .input(updateGroupSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await groupService.updateGroup(id, data);
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await groupService.deleteGroup(input.id);
      return { success: true };
    }),

  getMembers: publicProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ input }) => {
      return await groupService.getGroupMembers(input.groupId);
    }),

  addMember: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        member: memberSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const id = await groupService.addMemberToGroup(
        input.groupId,
        input.member,
      );
      return { id };
    }),

  removeMember: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await groupService.removeMemberFromGroup(input.groupId, input.memberId);
      return { success: true };
    }),
});
