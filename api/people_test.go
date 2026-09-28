package main

import (
	"strings"
	"testing"
)

func TestParseWeeklyHours(t *testing.T) {
	tests := []struct {
		name, body string
		want       float64
		wantErr    bool
	}{
		{name: "whole hours", body: `{"weeklyHours": 32}`, want: 32},
		{name: "fractional hours", body: `{"weeklyHours": 37.5}`, want: 37.5},
		{name: "zero is a valid capacity", body: `{"weeklyHours": 0}`, want: 0},
		{name: "upper bound", body: `{"weeklyHours": 168}`, want: 168},
		{name: "above upper bound", body: `{"weeklyHours": 168.5}`, wantErr: true},
		{name: "negative", body: `{"weeklyHours": -1}`, wantErr: true},
		{name: "missing field", body: `{}`, wantErr: true},
		{name: "null", body: `{"weeklyHours": null}`, wantErr: true},
		{name: "string value", body: `{"weeklyHours": "32"}`, wantErr: true},
		{name: "unknown field", body: `{"weeklyHours": 32, "name": "x"}`, wantErr: true},
		{name: "malformed", body: `{"weeklyHours":`, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseWeeklyHours(strings.NewReader(tt.body))
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got %v", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}
