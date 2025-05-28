package com.singleproject.gachimind.controller;

import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@Log4j2
@RequestMapping(value = "/html")
public class ChatController {

    @GetMapping("/index")
    public String getChat() {
        log.info("@ChatController, chat GET()");
        return "index";
    }
}
