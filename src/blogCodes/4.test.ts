import { describe, expect, test } from "vitest";
import { formHandler } from "../useForm1";
import { waitFor } from "@testing-library/react";

/////////////////////////////////////////////////////////////////////////////////////////////////

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
      name: "submit하는 경우",
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
