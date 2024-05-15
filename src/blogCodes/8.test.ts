import { waitFor } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { formHandler, Handler, SetState } from "../useForm2";

type TestCase<Config, State, Result> = {
  name: string;
  config?: Partial<Config>;
  prevState?: Partial<State>;
  event?: (result: Result) => void;
  doExpect: (getResult: () => Result) => Promise<void> | void;
};

const hookTest = <Config, State, Result>({
  name,
  handler,
  defaultConfig,
  defaultState,
  testCases,
}: {
  name: string;
  handler: Handler<Config, State, Result>;
  defaultConfig: Config;
  defaultState: State;
  testCases: TestCase<Config, State, Result>[];
}) => {
  const createState = (state?: Partial<State>): State => ({
    ...defaultState,
    ...state,
  });
  const createConfig = (config?: Partial<Config>): Config => ({
    ...defaultConfig,
    ...config,
  });
  describe(name, () => {
    test.each(testCases)(
      "$name",
      async ({ config, prevState, event, doExpect }) => {
        const state = { current: createState(prevState) };
        const setState: SetState<State> = (set) => {
          state.current = set(state.current);
        };
        const getResult = (state: State) =>
          handler(createConfig(config), state, setState);
        event?.(getResult(state.current));
        await doExpect(() => getResult(state.current));
      }
    );
  });
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////

hookTest({
  name: "useForm 테스트",
  handler: formHandler,
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
      event: (result) => {
        result.change("a");
      },
      doExpect: (getResult) => {
        expect(getResult().value).toBe("a");
      },
    },
    {
      name: "submit 하는 경우",
      prevState: { value: "a", isSubmitting: false, error: "error" },
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
      prevState: { value: "xxx", isSubmitting: false, error: "" },
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
  ],
});
