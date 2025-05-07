import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import * as pollService from "../../../lib/pollService";
import { doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

// Define validation schemas using Zod
const createPollSchema = z.object({
  poll_name: z.string().min(1),
  poll_description: z.string(),
  poll_group_id: z.string(),
});

const updatePollSchema = z.object({
  id: z.string(),
  poll_name: z.string().min(1).optional(),
  poll_description: z.string().optional(),
  poll_group_id: z.string().optional(),
});

const questionSchema = z.object({
  question: z.string().min(1),
  choices: z.array(z.string().min(1)),
  index: z.number().optional(), // 추가: index 필드도 가능하게 함
});

const updateQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1).optional(),
  choices: z.array(z.string().min(1)).optional(),
  index: z.number().optional(), // 추가: index 필드 허용
});

export const pollRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return await pollService.getPolls();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await pollService.getPollById(input.id);
    }),

  create: publicProcedure
    .input(createPollSchema)
    .mutation(async ({ input }) => {
      const { poll_group_id, ...rest } = input;
      const groupRef = doc(db, "groups", poll_group_id);

      const id = await pollService.createPoll({
        ...rest,
        poll_group: groupRef,
      });
      return { id };
    }),

  update: publicProcedure
    .input(updatePollSchema)
    .mutation(async ({ input }) => {
      const { id, poll_group_id, ...rest } = input;

      const updateData: any = { ...rest };
      if (poll_group_id) {
        const groupRef = doc(db, "groups", poll_group_id);
        updateData.poll_group = groupRef;
      }

      await pollService.updatePoll(id, updateData);
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await pollService.deletePoll(input.id);
        return { success: true };
      } catch (error) {
        console.error(
          `Error in poll.delete mutation for poll ${input.id}:`,
          error,
        );
        throw new Error(
          `Failed to delete poll: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  getQuestions: publicProcedure
    .input(z.object({ pollId: z.string() }))
    .query(async ({ input }) => {
      return await pollService.getPollQuestions(input.pollId);
    }),

  addQuestion: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        question: questionSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const id = await pollService.createQuestion(input.pollId, input.question);
      return { id };
    }),

  updateQuestion: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
        question: updateQuestionSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input.question;
      await pollService.updateQuestion(input.pollId, input.questionId, data);
      return { success: true };
    }),

  deleteQuestion: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await pollService.deleteQuestion(input.pollId, input.questionId);
      return { success: true };
    }),

  moveQuestionUp: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await pollService.moveQuestionUp(
        input.pollId,
        input.questionId,
      );
      return { success };
    }),

  moveQuestionDown: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await pollService.moveQuestionDown(
        input.pollId,
        input.questionId,
      );
      return { success };
    }),

  updateActiveQuestion: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      await pollService.updateActiveQuestion(input.pollId, input.questionId);
      return { success: true };
    }),

  getActiveQuestion: publicProcedure
    .input(z.object({ pollId: z.string() }))
    .query(async ({ input }) => {
      return await pollService.getActiveQuestion(input.pollId);
    }),

  calculatePollResults: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const results = await pollService.calculateAndSavePollResults(
        input.pollId,
        input.questionId,
      );
      return { success: true, results };
    }),

  clearPollResults: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await pollService.clearPollResults(input.pollId, input.questionId);
      return { success: true };
    }),

  getPollResults: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await pollService.getPollResults(input.pollId, input.questionId);
    }),

  getQuestionAnswers: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        questionId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await pollService.getAllAnswersForQuestion(
        input.pollId,
        input.questionId,
      );
    }),

  calculateParticipantStats: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const stats = await pollService.calculateAndSaveParticipantStats(
        input.pollId,
      );
      return { success: true, stats };
    }),

  getParticipantStats: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await pollService.getParticipantStats(input.pollId);
    }),
});
