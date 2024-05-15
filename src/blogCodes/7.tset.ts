import { describe, test } from "vitest";
import { Handler, SetState } from "../useForm2";

///////////////////////////////////////////////////////////////////////////////

type TestCase<Config, State, Result> = {
  name: string;
  config?: Partial<Config>;
  prevState?: Partial<State>;
  event?: (result: Result) => void;
  doExpect: (getResult: () => Result) => Promise<void> | void;
};

const hookTest = <Config, State, Result>(params: {
  name: string;
  handler: Handler<Config, State, Result>;
  defaultConfig: Config;
  defaultState: State;
  testCases: TestCase<Config, State, Result>[];
}) => {
  const { name, handler, defaultConfig, defaultState, testCases } = params;
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
