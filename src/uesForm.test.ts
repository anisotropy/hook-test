import { waitFor } from "@testing-library/react";
import { hookTest } from "./lib/createHook";
import { formHandler } from "./useForm";
import { expect, vi } from "vitest";

hookTest(formHandler)({
  name: "formHandler",
  defaultParams: { initialValue: "", errorMessage: "error" },
  defaultConfig: {
    submitter: async (value: string) => {
      await new Promise((r) => setTimeout(r, 100));
      if (value === "xxx") throw new Error("");
    },
  },
  defaultState: { value: "", error: "", isSubmitting: false },
  testCases: [
    {
      name: "값을 변경하는 경우",
      event: ({ result }) => {
        result.change("a");
      },
      doExpect: ({ getResult }) => {
        expect(getResult().value).toBe("a");
      },
    },
    {
      name: "submit 하는 경우",
      prevState: { value: "a", isSubmitting: false, error: "error" },
      event: ({ result }) => {
        result.submit();
      },
      doExpect: async ({ getResult }) => {
        expect(getResult().isSubmitting).toBe(true);
        await waitFor(() => {
          const { isSubmitting, error } = getResult();
          expect({ isSubmitting, error }).toEqual({
            isSubmitting: false,
            error: "",
          });
        });
      },
    },
    {
      name: "submit을 할 때 에러가 발생하는 경우",
      prevState: { value: "xxx", isSubmitting: false, error: "" },
      mocks: { onError: vi.fn() },
      event: ({ result, mocks }) => {
        result.submit({ onError: mocks.onError });
      },
      doExpect: async ({ getResult, params, mocks }) => {
        expect(getResult().isSubmitting).toBe(true);
        await waitFor(() => {
          const { isSubmitting, error } = getResult();
          expect({ isSubmitting, error }).toEqual({
            isSubmitting: false,
            error: params.errorMessage,
          });
        });
        expect(mocks.onError).toHaveBeenCalled();
      },
    },
  ],
});
