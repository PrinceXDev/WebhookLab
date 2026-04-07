"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EVENT_STATUS_FILTER_LABEL_BY_VALUE,
  EVENT_STATUS_FILTER_OPTIONS,
  type EventStatusFilterValue,
} from "@/constants/event-filters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, X } from "lucide-react";

export interface EventFilters {
  status: Set<EventStatusFilterValue>;
  providers: Set<string>;
  methods: Set<string>;
}

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  availableProviders: string[];
  availableMethods: string[];
}

export const EventFiltersComponent = ({
  filters,
  onFiltersChange,
  availableProviders,
  availableMethods,
}: EventFiltersProps) => {
  const hasActiveFilters =
    filters.status.size > 0 ||
    filters.providers.size > 0 ||
    filters.methods.size > 0;

  const toggleStatus = (status: EventStatusFilterValue) => {
    const newStatus = new Set(filters.status);
    if (newStatus.has(status)) {
      newStatus.delete(status);
    } else {
      newStatus.add(status);
    }
    onFiltersChange({ ...filters, status: newStatus });
  };

  const toggleProvider = (provider: string) => {
    const newProviders = new Set(filters.providers);
    if (newProviders.has(provider)) {
      newProviders.delete(provider);
    } else {
      newProviders.add(provider);
    }
    onFiltersChange({ ...filters, providers: newProviders });
  };

  const toggleMethod = (method: string) => {
    const newMethods = new Set(filters.methods);
    if (newMethods.has(method)) {
      newMethods.delete(method);
    } else {
      newMethods.add(method);
    }
    onFiltersChange({ ...filters, methods: newMethods });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: new Set(),
      providers: new Set(),
      methods: new Set(),
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0"
              >
                {filters.status.size +
                  filters.providers.size +
                  filters.methods.size}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {EVENT_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={filters.status.has(value)}
              onCheckedChange={() => toggleStatus(value)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}

          {availableProviders.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Provider</DropdownMenuLabel>
              {availableProviders.map((provider) => (
                <DropdownMenuCheckboxItem
                  key={provider}
                  checked={filters.providers.has(provider)}
                  onCheckedChange={() => toggleProvider(provider)}
                >
                  {provider.toUpperCase()}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}

          {availableMethods.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Method</DropdownMenuLabel>
              {availableMethods.map((method) => (
                <DropdownMenuCheckboxItem
                  key={method}
                  checked={filters.methods.has(method)}
                  onCheckedChange={() => toggleMethod(method)}
                >
                  {method}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters && (
        <>
          {Array.from(filters.status).map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {EVENT_STATUS_FILTER_LABEL_BY_VALUE[status]}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleStatus(status)}
              />
            </Badge>
          ))}
          {Array.from(filters.providers).map((provider) => (
            <Badge key={provider} variant="secondary" className="gap-1">
              {provider.toUpperCase()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleProvider(provider)}
              />
            </Badge>
          ))}
          {Array.from(filters.methods).map((method) => (
            <Badge key={method} variant="secondary" className="gap-1">
              {method}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => toggleMethod(method)}
              />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        </>
      )}
    </div>
  );
};
