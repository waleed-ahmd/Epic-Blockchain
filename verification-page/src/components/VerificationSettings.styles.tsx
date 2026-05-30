import styled from "styled-components";

export const SettingsContainer = styled.details`
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
`;

export const SettingsSummary = styled.summary`
  cursor: pointer;
  font-weight: 700;
`;

export const SettingsGrid = styled.div`
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
`;

export const SettingsLabel = styled.label`
  display: grid;
  gap: 0.4rem;
  color: #cbd5e1;
`;

export const RpcInput = styled.input`
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.72);
  color: #e5edf7;
  outline: none;
`;
