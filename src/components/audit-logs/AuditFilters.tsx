import React, { useCallback, useState, useEffect, useRef } from 'react';
import { operationOptions } from '../../utils/constants';
import { DismissIcon, FilterIcon, ChevronDownIcon } from '../common/Icons';

interface ActionOption {
  value: number;
  label: string;
}

interface SelectedItem {
  id: string;
  name: string;
}

interface AuditFiltersProps {
  selectedTab: string;
  actions: number[];
  fromDate: Date | null;
  toDate: Date | null;
  onActionsChange: (actions: number[]) => void;
  onFromDateChange: (date: Date | null) => void;
  onToDateChange: (date: Date | null) => void;
  onClearFilters: () => void;
  disabled?: boolean;
  // Tab-specific action options
  actionOptions: ActionOption[];
  // Operations (only for details tab)
  operations?: number[];
  onOperationsChange?: (operations: number[]) => void;
  // User filter (multi-select)
  selectedUsers?: SelectedItem[];
  onUsersChange?: (users: SelectedItem[]) => void;
  showUserFilter?: boolean;
  // Security role filter (multi-select)
  selectedSecurityRoles?: SelectedItem[];
  onSecurityRolesChange?: (roles: SelectedItem[]) => void;
  showSecurityRoleFilter?: boolean;
}

// Dropdown component for multiselect
interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const displayText = selectedValues.length === 0
    ? placeholder
    : `${selectedValues.length} selected`;

  return (
    <div className="flex flex-col gap-1 min-w-[130px]" ref={containerRef}>
      <label className="text-xs font-semibold text-foreground-3">{label}</label>
      <div className="relative">
        <button
          type="button"
          className="input text-left flex items-center justify-between gap-2 w-full"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={selectedValues.length === 0 ? 'text-foreground-4' : ''}>
            {displayText}
          </span>
          <ChevronDownIcon className={`w-4 h-4 text-foreground-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[200px] overflow-auto shadow-lg card">
            <div className="p-1">
              {options.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-background-2 ${isSelected ? 'bg-background-2' : ''}`}
                    onClick={() => handleToggle(option.value)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-stroke-1"
                    />
                    <span className="text-sm">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Search combobox for users/roles
interface SearchComboboxProps {
  label: string;
  placeholder: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  results: SelectedItem[];
  onSelect: (item: SelectedItem) => void;
  selectedItems: SelectedItem[];
  onRemove: (id: string) => void;
  isSearching: boolean;
  disabled?: boolean;
}

const SearchCombobox: React.FC<SearchComboboxProps> = ({
  label,
  placeholder,
  searchTerm,
  onSearchChange,
  results,
  onSelect,
  selectedItems,
  onRemove,
  isSearching,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1 min-w-[180px]" ref={containerRef}>
      <label className="text-xs font-semibold text-foreground-3">{label}</label>
      <div className="relative">
        <input
          type="text"
          className="input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <div className="spinner spinner-sm text-blue-600" />
          </div>
        )}

        {isOpen && (searchTerm.length >= 2 || results.length > 0) && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[200px] overflow-auto shadow-lg card">
            <div className="p-1">
              {isSearching && (
                <div className="px-3 py-2 text-sm text-foreground-3">Searching...</div>
              )}
              {!isSearching && results.length === 0 && searchTerm.length >= 2 && (
                <div className="px-3 py-2 text-sm text-foreground-3">No results found</div>
              )}
              {!isSearching && results.map(item => (
                <div
                  key={item.id}
                  className="px-3 py-2 rounded cursor-pointer hover:bg-background-2 text-sm"
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedItems.map(item => (
            <span key={item.id} className="badge badge-neutral flex items-center gap-1 text-xs">
              {item.name}
              <button
                className="p-0.5 hover:bg-gray-600/20 rounded"
                onClick={() => onRemove(item.id)}
              >
                <DismissIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const AuditFilters: React.FC<AuditFiltersProps> = ({
  selectedTab,
  actions,
  fromDate,
  toDate,
  onActionsChange,
  onFromDateChange,
  onToDateChange,
  onClearFilters,
  disabled = false,
  actionOptions,
  operations = [],
  onOperationsChange,
  selectedUsers = [],
  onUsersChange,
  showUserFilter = false,
  selectedSecurityRoles = [],
  onSecurityRolesChange,
  showSecurityRoleFilter = false,
}) => {
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<SelectedItem[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [roleSearchResults, setRoleSearchResults] = useState<SelectedItem[]>([]);
  const [isSearchingRoles, setIsSearchingRoles] = useState(false);

  // Debounce timer refs
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roleSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Convert date to input string format
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleFromDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onFromDateChange(value ? new Date(value) : null);
    },
    [onFromDateChange]
  );

  const handleToDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onToDateChange(value ? new Date(value) : null);
    },
    [onToDateChange]
  );

  // Search for users with debounce
  const searchUsers = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }
    setIsSearchingUsers(true);
    try {
      console.log('[AuditFilters] Searching users:', searchTerm);
      const response = await window.dataverseAPI.queryData(
        `systemusers?$select=systemuserid,fullname&$filter=contains(fullname,'${searchTerm}')&$top=10`
      );
      console.log('[AuditFilters] User search response:', response);
      const users = (response as any).value || response || [];
      const mappedUsers = Array.isArray(users)
        ? users.map((u: any) => ({ id: u.systemuserid, name: u.fullname || u.domainname || 'Unknown' }))
        : [];
      // Filter out already selected users
      const filteredUsers = mappedUsers.filter(
        (u: SelectedItem) => !selectedUsers.some(su => su.id === u.id)
      );
      setUserSearchResults(filteredUsers);
    } catch (err) {
      console.error('[AuditFilters] Error searching users:', err);
      setUserSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  }, [selectedUsers]);

  const handleUserSearchInput = useCallback((value: string) => {
    setUserSearchTerm(value);
    if (userSearchTimerRef.current) {
      clearTimeout(userSearchTimerRef.current);
    }
    if (value.length >= 2) {
      setIsSearchingUsers(true);
      userSearchTimerRef.current = setTimeout(() => {
        searchUsers(value);
      }, 300);
    } else {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
    }
  }, [searchUsers]);

  // Search for security roles with debounce
  const searchRoles = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setRoleSearchResults([]);
      setIsSearchingRoles(false);
      return;
    }
    setIsSearchingRoles(true);
    try {
      console.log('[AuditFilters] Searching roles:', searchTerm);
      const response = await window.dataverseAPI.queryData(
        `roles?$select=roleid,name&$filter=contains(name,'${searchTerm}')&$top=10`
      );
      console.log('[AuditFilters] Role search response:', response);
      const roles = (response as any).value || response || [];
      const mappedRoles = Array.isArray(roles)
        ? roles.map((r: any) => ({ id: r.roleid, name: r.name }))
        : [];
      // Filter out already selected roles
      const filteredRoles = mappedRoles.filter(
        (r: SelectedItem) => !selectedSecurityRoles.some(sr => sr.id === r.id)
      );
      setRoleSearchResults(filteredRoles);
    } catch (err) {
      console.error('[AuditFilters] Error searching roles:', err);
      setRoleSearchResults([]);
    } finally {
      setIsSearchingRoles(false);
    }
  }, [selectedSecurityRoles]);

  const handleRoleSearchInput = useCallback((value: string) => {
    setRoleSearchTerm(value);
    if (roleSearchTimerRef.current) {
      clearTimeout(roleSearchTimerRef.current);
    }
    if (value.length >= 2) {
      setIsSearchingRoles(true);
      roleSearchTimerRef.current = setTimeout(() => {
        searchRoles(value);
      }, 300);
    } else {
      setRoleSearchResults([]);
      setIsSearchingRoles(false);
    }
  }, [searchRoles]);

  const handleUserSelect = useCallback((user: SelectedItem) => {
    onUsersChange?.([...selectedUsers, user]);
    setUserSearchTerm('');
    setUserSearchResults([]);
  }, [selectedUsers, onUsersChange]);

  const handleRemoveUser = useCallback((userId: string) => {
    onUsersChange?.(selectedUsers.filter(u => u.id !== userId));
  }, [selectedUsers, onUsersChange]);

  const handleRoleSelect = useCallback((role: SelectedItem) => {
    onSecurityRolesChange?.([...selectedSecurityRoles, role]);
    setRoleSearchTerm('');
    setRoleSearchResults([]);
  }, [selectedSecurityRoles, onSecurityRolesChange]);

  const handleRemoveRole = useCallback((roleId: string) => {
    onSecurityRolesChange?.(selectedSecurityRoles.filter(r => r.id !== roleId));
  }, [selectedSecurityRoles, onSecurityRolesChange]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (userSearchTimerRef.current) clearTimeout(userSearchTimerRef.current);
      if (roleSearchTimerRef.current) clearTimeout(roleSearchTimerRef.current);
    };
  }, []);

  const hasFilters =
    (selectedTab === 'details' && operations.length > 0) ||
    actions.length > 0 ||
    fromDate !== null ||
    toDate !== null ||
    selectedUsers.length > 0 ||
    selectedSecurityRoles.length > 0;

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-xs font-semibold text-foreground-3">From Date</label>
        <input
          type="date"
          className="input"
          value={formatDateForInput(fromDate)}
          onChange={handleFromDateChange}
          disabled={disabled}
        />
      </div>

      <div className="flex flex-col gap-1 min-w-[140px]">
        <label className="text-xs font-semibold text-foreground-3">To Date</label>
        <input
          type="date"
          className="input"
          value={formatDateForInput(toDate)}
          onChange={handleToDateChange}
          disabled={disabled}
        />
      </div>

      {selectedTab === 'details' && onOperationsChange && (
        <MultiSelectDropdown
          label="Operations"
          placeholder="All operations"
          options={operationOptions.map(op => ({ value: String(op.value), label: op.label }))}
          selectedValues={operations.map(String)}
          onChange={(values) => onOperationsChange(values.map(Number))}
          disabled={disabled}
        />
      )}

      <MultiSelectDropdown
        label="Actions"
        placeholder="All actions"
        options={actionOptions.map(a => ({ value: String(a.value), label: a.label }))}
        selectedValues={actions.map(String)}
        onChange={(values) => onActionsChange(values.map(Number))}
        disabled={disabled}
      />

      {showUserFilter && (
        <SearchCombobox
          label="Users"
          placeholder="Search users..."
          searchTerm={userSearchTerm}
          onSearchChange={handleUserSearchInput}
          results={userSearchResults}
          onSelect={handleUserSelect}
          selectedItems={selectedUsers}
          onRemove={handleRemoveUser}
          isSearching={isSearchingUsers}
          disabled={disabled}
        />
      )}

      {showSecurityRoleFilter && (
        <SearchCombobox
          label="Security Roles"
          placeholder="Search roles..."
          searchTerm={roleSearchTerm}
          onSearchChange={handleRoleSearchInput}
          results={roleSearchResults}
          onSelect={handleRoleSelect}
          selectedItems={selectedSecurityRoles}
          onRemove={handleRemoveRole}
          isSearching={isSearchingRoles}
          disabled={disabled}
        />
      )}

      {hasFilters && (
        <button
          className="btn-subtle ml-auto flex items-center gap-1"
          onClick={onClearFilters}
          disabled={disabled}
        >
          <FilterIcon className="w-4 h-4" />
          Clear Filters
        </button>
      )}
    </div>
  );
};
