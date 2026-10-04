/*
 * measure <fd> <command...>
 * Командыг жижиг процессоос fork хийж ажиллуулаад CPU хугацаа, санах ойн оргилыг (ru_maxrss) <fd>-д бичнэ.
 * Python worker-оос шууд ажиллуулбал ru_maxrss нь worker-ийн санах ойг (≈50MB) өвлөдөг тул энэ туслах хэрэгтэй.
 * Гаралт: "<exit> <signal> <cpu_ms> <maxrss_kb>\n"
 */
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc < 3) return 2;
  int fd = atoi(argv[1]);
  pid_t pid = fork();
  if (pid < 0) return 3;
  if (pid == 0) {
    close(fd); /* сурагчийн програм хэмжилтийн сувагт бичиж чадахгүй */
    execvp(argv[2], argv + 2);
    _exit(127);
  }
  int st = 0;
  struct rusage ru;
  while (wait4(pid, &st, 0, &ru) < 0) {
    if (errno != EINTR) return 4;
  }
  long cpu = ru.ru_utime.tv_sec * 1000L + ru.ru_utime.tv_usec / 1000 + ru.ru_stime.tv_sec * 1000L + ru.ru_stime.tv_usec / 1000;
  char buf[128];
  int n = snprintf(buf, sizeof buf, "%d %d %ld %ld\n", WIFEXITED(st) ? WEXITSTATUS(st) : -1,
                   WIFSIGNALED(st) ? WTERMSIG(st) : 0, cpu, ru.ru_maxrss);
  if (write(fd, buf, n) < 0) return 5;
  return 0;
}
