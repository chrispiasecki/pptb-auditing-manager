import { useReducer, useCallback } from 'react';
import { AuditFiltersState, initialFiltersState } from '../model/auditLog';

// Action types for filter reducer
type FilterAction =
  | { type: 'SET_TABLES'; payload: string[] }
  | { type: 'SET_RECORD'; payload: { id: string | null; name: string | null } }
  | { type: 'SET_ATTRIBUTES'; payload: string[] }
  | { type: 'SET_OPERATIONS'; payload: number[] }
  | { type: 'SET_ACTIONS'; payload: number[] }
  | { type: 'SET_FROM_DATE'; payload: Date | null }
  | { type: 'SET_TO_DATE'; payload: Date | null }
  | { type: 'SET_USERS'; payload: Array<{ id: string; name: string }> }
  | { type: 'SET_SECURITY_ROLES'; payload: Array<{ id: string; name: string }> }
  | { type: 'CLEAR_FILTERS' };

// Filter reducer
function filterReducer(state: AuditFiltersState, action: FilterAction): AuditFiltersState {
  switch (action.type) {
    case 'SET_TABLES':
      return {
        ...state,
        tableLogicalNames: action.payload,
        // Clear record selection when tables change
        recordId: null,
        recordName: null,
      };
    case 'SET_RECORD':
      return {
        ...state,
        recordId: action.payload.id,
        recordName: action.payload.name,
      };
    case 'SET_ATTRIBUTES':
      return { ...state, selectedAttributes: action.payload };
    case 'SET_OPERATIONS':
      return { ...state, operations: action.payload };
    case 'SET_ACTIONS':
      return { ...state, actions: action.payload };
    case 'SET_FROM_DATE':
      return { ...state, fromDate: action.payload };
    case 'SET_TO_DATE':
      return { ...state, toDate: action.payload };
    case 'SET_USERS':
      return {
        ...state,
        selectedUsers: action.payload,
      };
    case 'SET_SECURITY_ROLES':
      return {
        ...state,
        selectedSecurityRoles: action.payload,
      };
    case 'CLEAR_FILTERS':
      return {
        ...initialFiltersState,
        tableLogicalNames: state.tableLogicalNames,
      };
    default:
      return state;
  }
}

export interface UseAuditFiltersResult {
  filters: AuditFiltersState;
  setTables: (logicalNames: string[]) => void;
  setRecord: (id: string | null, name: string | null) => void;
  setSelectedAttributes: (attributes: string[]) => void;
  setOperations: (operations: number[]) => void;
  setActions: (actions: number[]) => void;
  setFromDate: (date: Date | null) => void;
  setToDate: (date: Date | null) => void;
  setUsers: (users: Array<{ id: string; name: string }>) => void;
  setSecurityRoles: (roles: Array<{ id: string; name: string }>) => void;
  clearFilters: () => void;
}

/**
 * Hook for managing audit log filter state
 * @param onFilterChange - Optional callback when filters change (for resetting pagination)
 */
export function useAuditFilters(onFilterChange?: () => void): UseAuditFiltersResult {
  const [filters, dispatch] = useReducer(filterReducer, initialFiltersState);

  const setTables = useCallback((logicalNames: string[]) => {
    dispatch({ type: 'SET_TABLES', payload: logicalNames });
    onFilterChange?.();
  }, [onFilterChange]);

  const setRecord = useCallback((id: string | null, name: string | null) => {
    dispatch({ type: 'SET_RECORD', payload: { id, name } });
    onFilterChange?.();
  }, [onFilterChange]);

  const setSelectedAttributes = useCallback((attributes: string[]) => {
    dispatch({ type: 'SET_ATTRIBUTES', payload: attributes });
  }, []);

  const setOperations = useCallback((operations: number[]) => {
    dispatch({ type: 'SET_OPERATIONS', payload: operations });
    onFilterChange?.();
  }, [onFilterChange]);

  const setActions = useCallback((actions: number[]) => {
    dispatch({ type: 'SET_ACTIONS', payload: actions });
    onFilterChange?.();
  }, [onFilterChange]);

  const setFromDate = useCallback((date: Date | null) => {
    dispatch({ type: 'SET_FROM_DATE', payload: date });
    onFilterChange?.();
  }, [onFilterChange]);

  const setToDate = useCallback((date: Date | null) => {
    dispatch({ type: 'SET_TO_DATE', payload: date });
    onFilterChange?.();
  }, [onFilterChange]);

  const setUsers = useCallback((users: Array<{ id: string; name: string }>) => {
    dispatch({ type: 'SET_USERS', payload: users });
    onFilterChange?.();
  }, [onFilterChange]);

  const setSecurityRoles = useCallback((roles: Array<{ id: string; name: string }>) => {
    dispatch({ type: 'SET_SECURITY_ROLES', payload: roles });
    onFilterChange?.();
  }, [onFilterChange]);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
    onFilterChange?.();
  }, [onFilterChange]);

  return {
    filters,
    setTables,
    setRecord,
    setSelectedAttributes,
    setOperations,
    setActions,
    setFromDate,
    setToDate,
    setUsers,
    setSecurityRoles,
    clearFilters,
  };
}
