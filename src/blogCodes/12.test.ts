import { Handler, SetRef, SetState } from "../useForm3";
import { describe, test, Mock, vi } from "vitest";

type Mocks = Record<string, Mock>;

type TestCase<Params, Config, State, Ref, Result> = {
  name: string;
  params?: Partial<Params>;
  config?: Partial<Config>;
  prevState?: Partial<State>;
  prevRef?: Partial<Ref>;
  mocks?: Mocks;
  event?: (p: { result: Result; mocks: Mocks }) => void;
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
    p: {
      name: string;
      testCases: Array<TestCase<Params, Config, State, Ref, Result>>;
    } & (Params extends void ? {} : { defaultParams: Params }) &
      (Config extends void ? {} : { defaultConfig: Config }) &
      (State extends void ? {} : { defaultState: State }) &
      (Ref extends void ? {} : { defaultRef: Ref })
  ) => {
    const defaultParams =
      "defaultParams" in p ? p.defaultParams : (undefined as Params);
    const defaultConfig =
      "defaultConfig" in p ? p.defaultConfig : (undefined as Config);
    const defaultState =
      "defaultState" in p ? p.defaultState : (undefined as State);
    const defaultRef = "defaultRef" in p ? p.defaultRef : (undefined as Ref);

    const { name, testCases } = p;
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
          mocks = { _: vi.fn() },
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
          event?.({ result: getResult(state.current, ref.current), mocks });
          await doExpect({
            getResult: () => getResult(state.current, ref.current),
            params: createParams(params),
            mocks,
          });
        }
      );
    });
  };
