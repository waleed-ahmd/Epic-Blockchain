import styled from "styled-components";

type StatusState = "idle" | "pass" | "fail";

export const Topbar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.4rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(16px);
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

export const BrandMark = styled.div`
  display: grid;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.8rem;
  background: #6ee7b7;
  color: #07111f;
  font-weight: 800;
`;

export const BrandText = styled.div`
  strong,
  span {
    display: block;
  }

  span {
    color: #94a3b8;
    font-size: 0.9rem;
  }
`;

export const StatusBadge = styled.div<{ $state: StatusState }>`
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  background: ${({ $state }) =>
    $state === "pass"
      ? "rgba(34, 197, 94, 0.14)"
      : $state === "fail"
        ? "rgba(248, 113, 113, 0.14)"
        : "rgba(148, 163, 184, 0.14)"};
  color: ${({ $state }) =>
    $state === "pass" ? "#86efac" : $state === "fail" ? "#fca5a5" : "#cbd5e1"};
  font-weight: 700;
`;
