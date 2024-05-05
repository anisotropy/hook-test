import { waitFor } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { formHandler } from "./useForm1";

type Params = Parameters<typeof formHandler>[0];
type Result = ReturnType<typeof formHandler>;

const createState = (state?: Partial<Params["state"]>): Params["state"] => ({
  value: "",
  error: "",
  isSubmitting: false,
  ...state,
});

const createParams = (params?: Partial<Params>): Params => ({
  state: createState(),
  submitter: async (value: string) => {
    await new Promise((r) => setTimeout(r, 100));
    if (value === "xxx") throw new Error("");
  },
  setState: () => undefined,
  ...params,
});

describe("formHandler", () => {
  type TestCases = {
    name: string;
    params: Params;
    prevState: Params["state"];
    event?: (result: Result) => void;
    doExpect: (getResult: () => Result) => Promise<void> | void;
  }[];
  const testCases: TestCases = [
    {
      name: "값을 변경하는 경우",
      params: createParams(),
      prevState: createState({ value: "" }),
      event: (result) => {
        result.change("a");
      },
      doExpect: (getResult) => {
        expect(getResult().value).toBe("a");
      },
    },
    {
      name: "submit 하는 경우",
      params: createParams(),
      prevState: createState({
        value: "a",
        isSubmitting: false,
        error: "error",
      }),
      event: (result) => {
        result.submit();
      },
      doExpect: async (getResult) => {
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
      params: createParams(),
      prevState: createState({ value: "xxx", isSubmitting: false, error: "" }),
      event: (result) => {
        result.submit();
      },
      doExpect: async (getResult) => {
        expect(getResult().isSubmitting).toBe(true);
        await waitFor(() => {
          const { isSubmitting, error } = getResult();
          expect({ isSubmitting, error }).toEqual({
            isSubmitting: false,
            error: "error",
          });
        });
      },
    },
  ];
  test.each(testCases)(
    "$name",
    async ({ params, prevState, event, doExpect }) => {
      const state = { current: prevState };
      const setState: Params["setState"] = (set) => {
        state.current = set(state.current);
      };
      const getResult = (state: Params["state"]) =>
        formHandler({ ...params, state, setState });
      event?.(getResult(state.current));
      await doExpect(() => getResult(state.current));
    }
  );
});
