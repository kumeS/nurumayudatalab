FROM rstudio/plumber:latest

COPY . .

RUN R -e "install.packages('loadings')"

EXPOSE 7860

CMD ["Rscript", "-e", "library(plumber); r <- plumb('./src/api-integrated.R'); r$run(host='0.0.0.0', port=7860)"]
