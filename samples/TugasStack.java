package id.ac.maranatha.praktikum;

import java.util.Scanner;

public class TugasStack {

    // Student's custom main test driver
    public static void main(String[] args) {
        StackArray s = new StackArray(5);
        s.push(15);
        s.push(30);
        s.push(45);
        s.pop();
        s.push(60);
    }
}
