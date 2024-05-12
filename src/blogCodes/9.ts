import { useRef } from "react";

/////////////////////////////////////////

type SetState<S> = (set: (state: S) => S) => void;

type SetRef<R> = SetState<R>;

const useRefState = <Ref>(initRef: Ref): [Ref, SetRef<Ref>] => {
  const ref = useRef(initRef);
  const setRef = (set: (prev: Ref) => Ref) => {
    ref.current = set(ref.current);
  };
  return [ref.current, setRef];
};
