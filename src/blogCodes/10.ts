import { useRef, useState } from "react";

////////////////////////////////////////////////////////////////

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
