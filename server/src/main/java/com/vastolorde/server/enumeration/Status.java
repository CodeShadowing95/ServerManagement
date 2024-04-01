package com.vastolorde.server.enumeration;

import lombok.Getter;

@Getter
public enum Status {
    SERVER_UP("SERVER_UP"),
    SERVER_DOWN("SERVER_DOWN");

    private final String status;

    Status(String status) {
        this.status = status;
    }

}
