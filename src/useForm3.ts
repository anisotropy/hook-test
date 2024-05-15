import { useRef, useState } from "react";

type SetState<S> = (set: (state: S) => S) => void;

type SetRef<R> = SetState<R>;

type CreateState<Params, S> = (params: Params) => [S, SetState<S>];

type CreateRef<Params, R> = CreateState<Params, R>;

type Handler<Params, Config, State, Ref, Result> = (handlerParams: {
  config: Config;
  state: State;
  setState: SetState<State>;
  ref: Ref;
  setRef: SetRef<Ref>;
}) => (params: Params) => Result;

const createHook =
  <Params = void, Config = void, State = void, Ref = void, Result = void>(
    handler: Handler<Params, Config, State, Ref, Result>
  ) =>
  (
    hookParams: (Config extends void ? {} : { config: Config }) &
      (State extends void ? {} : { createState: CreateState<Params, State> }) &
      (Ref extends void ? {} : { createRef: CreateRef<Params, Ref> })
  ) =>
  (params: Params) => {
    const config =
      "config" in hookParams ? hookParams.config : (undefined as Config);
    const [state, setState] =
      "createState" in hookParams
        ? hookParams.createState(params)
        : ([] as unknown as ReturnType<CreateState<Params, State>>);
    const [ref, setRef] =
      "createRef" in hookParams
        ? hookParams.createRef(params)
        : ([] as unknown as ReturnType<CreateState<Params, Ref>>);
    return handler({ config, state, setState, ref, setRef })(params);
  };

const useRefState = <Ref>(initRef: Ref): [Ref, SetRef<Ref>] => {
  const ref = useRef(initRef);
  const setRef = (set: (prev: Ref) => Ref) => {
    ref.current = set(ref.current);
  };
  return [ref.current, setRef];
};

////

const submitValue = async (value: string) => {
  if (value === "xxx3") throw new Error("");
};

type State = { value: string; error: string; isSubmitting: boolean };

const initState: State = { value: "", error: "", isSubmitting: false };

const formHandler =
  ({
    config,
    state,
    setState,
  }: {
    config: { submitter: typeof submitValue };
    state: State;
    setState: SetState<State>;
  }) =>
  () => {
    const change = (value: string) => {
      setState((prev) => ({ ...prev, value }));
    };
    const submit = async () => {
      setState((prev) => ({ ...prev, isSubmitting: true }));
      try {
        await config.submitter(state.value);
        setState((prev) => ({ ...prev, error: "", isSubmitting: false }));
      } catch (error) {
        setState((prev) => ({ ...prev, error: "error", isSubmitting: false }));
      }
    };
    return { ...state, change, submit };
  };

const useForm = createHook(formHandler)({
  config: { submitter: submitValue },
  createState: () => useState(initState),
});

export type { Handler, SetState, SetRef };

export { useForm, formHandler };
