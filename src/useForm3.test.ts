import { waitFor } from "@testing-library/react";
import { describe, test, expect, Mock, vi } from "vitest";
import { formHandler, Handler, SetRef, SetState } from "./useForm3";

type Mocks = Record<string, Mock>;

type TestCase<Params, Config, State, Ref, Result> = {
  name: string;
  params?: Partial<Params>;
  config?: Partial<Config>;
  prevState?: Partial<State>;
  prevRef?: Partial<Ref>;
  mocks?: Mocks;
  event?: (result: Result) => void;
  doExpect: (p: {
    getResult: () => Result;
    params: Params;
    mocks: Mocks;
  }) => Promise<void> | void;
};

const mergeObj =
  <O>(obj: O) =>
  (partialObj?: Partial<O>): O => ({ ...obj, ...partialObj });

const hookTest =
  <Params = void, Config = void, State = void, Ref = void, Result = void>(
    handler: Handler<Params, Config, State, Ref, Result>
  ) =>
  (
    testParams: {
      name: string;
      testCases: Array<TestCase<Params, Config, State, Ref, Result>>;
    } & (Params extends void ? {} : { defaultParams: Params }) &
      (Config extends void ? {} : { defaultConfig: Config }) &
      (State extends void ? {} : { defaultState: State }) &
      (Ref extends void ? {} : { defaultRef: Ref })
  ) => {
    const defaultParams =
      "defaultParams" in testParams
        ? testParams.defaultParams
        : (undefined as Params);
    const defaultConfig =
      "defaultConfig" in testParams
        ? testParams.defaultConfig
        : (undefined as Config);
    const defaultState =
      "defaultState" in testParams
        ? testParams.defaultState
        : (undefined as State);
    const defaultRef =
      "defaultRef" in testParams ? testParams.defaultRef : (undefined as Ref);

    const { name, testCases } = testParams;
    const createParams = mergeObj(defaultParams);
    const createConfig = mergeObj(defaultConfig);
    const createState = mergeObj(defaultState);
    const createRef = mergeObj(defaultRef);

    describe(name, () => {
      test.each(testCases)(
        "$name",
        async ({
          params,
          config,
          prevState,
          prevRef,
          mocks,
          event,
          doExpect,
        }) => {
          const state = { current: createState(prevState) };
          const ref = { current: createRef(prevRef) };
          const setState: SetState<State> = (set) => {
            state.current = set(state.current);
          };
          const setRef: SetRef<Ref> = (set) => {
            ref.current = set(ref.current);
          };
          const getResult = (state: State, ref: Ref) =>
            handler({
              config: createConfig(config),
              state,
              setState,
              ref,
              setRef,
            })(createParams(params));
          event?.(getResult(state.current, ref.current));
          await doExpect({
            getResult: () => getResult(state.current, ref.current),
            params: createParams(params),
            mocks: mocks ?? { _: vi.fn() },
          });
        }
      );
    });
  };

////

hookTest(formHandler)({
  name: "formHandler",
  defaultConfig: {
    submitter: async (value: string) => {
      await new Promise((r) => setTimeout(r, 100));
      if (value === "xxx") throw new Error("");
    },
  },
  defaultState: {
    value: "",
    error: "",
    isSubmitting: false,
  },
  testCases: [
    {
      name: "값을 변경하는 경우",
      event: (result) => {
        result.change("a");
      },
      doExpect: ({ getResult }) => {
        expect(getResult().value).toBe("a");
      },
    },
    {
      name: "submit 하는 경우",
      prevState: { value: "a", isSubmitting: false, error: "error" },
      event: (result) => {
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
      event: (result) => {
        result.submit();
      },
      doExpect: async ({ getResult }) => {
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
