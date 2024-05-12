import { useRef, useState } from "react";

type SetState<S> = (set: (state: S) => S) => void;

type SetRef<R> = SetState<R>;

type CreateState<Params, S> = (params: Params) => [S, SetState<S>];

type CreateRef<Params, R> = CreateState<Params, R>;

type Handler<Params, Config, State, Ref, Result> = (
  config: Config
) => (
  state: State,
  setState: SetState<State>
) => (ref: Ref, setRef: SetRef<Ref>) => (params: Params) => Result;

const createHook =
  <Params = void, Config = void, State = void, Ref = void, Result = void>(
    handler: Handler<Params, Config, State, Ref, Result>
  ) =>
  (config: Config) =>
  (createState: State extends void ? void : CreateState<Params, State>) =>
  (createRef: Ref extends void ? void : CreateRef<Params, Ref>) =>
  (params: Params) => {
    const [state, setState] = createState
      ? createState(params)
      : ([] as unknown as ReturnType<CreateState<Params, State>>);
    const [ref, setRef] = createRef
      ? createRef(params)
      : ([] as unknown as ReturnType<CreateState<Params, Ref>>);
    return handler(config)(state, setState)(ref, setRef)(params);
  };

const useRefState = <Ref>(initRef: Ref): [Ref, SetRef<Ref>] => {
  const ref = useRef(initRef);
  const setRef = (set: (prev: Ref) => Ref) => {
    ref.current = set(ref.current);
  };
  return [ref.current, setRef];
};

const submitValue = async (value: string) => {
  if (value === "xxx") throw new Error("");
};

/////////////////////////////////////////////////////////////////////////////////////

type State = { value: string; error: string; isSubmitting: boolean };

const initState: State = { value: "", error: "", isSubmitting: false };

const formHandler =
  (config: { submitter: typeof submitValue }) =>
  (state: State, setSate: SetState<State>) =>
  () =>
  () => {
    const change = (value: string) => {
      setSate((prev) => ({ ...prev, value }));
    };
    const submit = async () => {
      setSate((prev) => ({ ...prev, isSubmitting: true }));
      try {
        await config.submitter(state.value);
        setSate((prev) => ({ ...prev, error: "", isSubmitting: false }));
      } catch (error) {
        setSate((prev) => ({ ...prev, error: "error", isSubmitting: false }));
      }
    };
    return { ...state, change, submit };
  };

const useForm = createHook(formHandler)({ submitter: submitValue })(() =>
  useState(initState)
)();

export type { Handler, SetState };

export { useForm, formHandler };
